import crypto from "node:crypto"
import { prisma } from "../../lib/prisma"
import { logger } from "../../lib/logger"
import { bumpCatalogVersion, getCatalogVersion, getOrSetCache } from "../../lib/redis"
import { gamingProviderClient } from "../provider-integration/gaming-provider/gaming-provider.client"
import { slugifyCategoryName } from "./category-seed"

/**
 * Pulls the provider/game catalog and upserts it into our own tables — the
 * frontend reads from here (CLAUDE.md caching strategy: game catalogs are
 * cache candidates, never fetched live per-request), not from the provider
 * directly.
 *
 * v2 endpoint set: our Provider/Game rows are keyed on `code`/`gameId` as a
 * generic "external unique identifier" column — for this provider that's
 * populated from the v2 API's own `id` field, because GameV2.provider_id
 * (confirmed against the real API) always references ProviderV2.id.
 *
 * Categories are not seeded or guessed — every Category row comes from a
 * GameV2.category value the provider actually returned, upserted on the
 * fly as games are synced. A game with no category from the provider is
 * stored with categoryId null rather than forced into an invented bucket.
 */
export async function syncCatalog(): Promise<{
  providersImported: number
  categoriesImported: number
  gamesImported: number
}> {
  const providers = await gamingProviderClient.getProviders()
  for (const p of providers) {
    await prisma.provider.upsert({
      where: { code: p.id },
      update: { name: p.name, syncedAt: new Date() },
      create: { code: p.id, name: p.name },
    })
  }

  const games = await gamingProviderClient.getGames()
  const categoryIdByCode = new Map<string, string>()
  let gamesImported = 0

  for (const g of games) {
    const provider = await prisma.provider.findUnique({ where: { code: g.provider_id } })
    if (!provider) {
      logger.warn(
        { providerId: g.provider_id, providerName: g.provider_name, game: g.name },
        `Skipping game "${g.name}" — provider not found for provider_id=${g.provider_id}`
      )
      continue
    }

    let categoryId: string | undefined
    if (g.category) {
      const code = slugifyCategoryName(g.category)
      if (!categoryIdByCode.has(code)) {
        const category = await prisma.category.upsert({
          where: { code },
          update: { name: g.category },
          create: { code, name: g.category },
        })
        categoryIdByCode.set(code, category.id)
      }
      categoryId = categoryIdByCode.get(code)
    }

    await prisma.game.upsert({
      where: { gameId: g.id },
      update: {
        gameCode: g.identifier,
        gameName: g.name,
        bannerUrl: g.thumbnail,
        providerId: provider.id,
        categoryId,
        syncedAt: new Date(),
      },
      create: {
        gameId: g.id,
        gameCode: g.identifier,
        gameName: g.name,
        bannerUrl: g.thumbnail,
        providerId: provider.id,
        categoryId,
      },
    })
    gamesImported += 1
  }

  // Every cached catalog/hero-banner response (below, and home.service.ts)
  // is keyed on this version — bumping it orphans all of them at once
  // rather than trying to enumerate every filter combination to delete.
  await bumpCatalogVersion()

  return { providersImported: providers.length, categoriesImported: categoryIdByCode.size, gamesImported }
}

export async function listProviders() {
  const version = await getCatalogVersion()
  return getOrSetCache(`catalog:v${version}:providers`, 300, () => prisma.provider.findMany({ orderBy: { name: "asc" } }))
}

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 50

/**
 * Some real synced categories each carry only a handful of games — too
 * sparse to justify their own shelf on the landing/dashboard category rows.
 * Each group below merges into one category (its `code`) everywhere
 * (listCategories, listGames, and therefore every hub/detail page built on
 * top of them) so there's a single source of truth instead of each
 * frontend consumer special-casing it. `teenpatti` and `hi-lo` move out of
 * the Live Casino grouping (lib/categoryGroups.ts on the frontend) as a
 * result — they default to the Casino group under their merged "casual"/
 * "arcade" codes, which is the intent here.
 */
const CATEGORY_MERGE_GROUPS: { code: string; name: string; sourceCodes: string[] }[] = [
  { code: "casual", name: "Casual", sourceCodes: ["casual", "lotto", "minigame", "teenpatti", "topcard"] },
  { code: "arcade", name: "Arcade", sourceCodes: ["arcade", "fish", "hi-lo"] },
]

function findMergeGroup(categoryCode: string) {
  return CATEGORY_MERGE_GROUPS.find((g) => g.code === categoryCode)
}

function mergeCategoryGroups<T extends { code: string; name: string; sortOrder: number }>(categories: T[]): T[] {
  let result = categories
  for (const group of CATEGORY_MERGE_GROUPS) {
    const grouped = result.filter((c) => group.sourceCodes.includes(c.code))
    if (grouped.length === 0) continue

    const rest = result.filter((c) => !group.sourceCodes.includes(c.code))
    const canonical = grouped.find((c) => c.code === group.code) ?? grouped[0]
    const merged: T = { ...canonical, code: group.code, name: group.name, sortOrder: Math.min(...grouped.map((c) => c.sortOrder)) }
    result = [...rest, merged]
  }

  return result.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export interface ListGamesFilters {
  categoryCode?: string
  providerCode?: string
  search?: string
  /** Exact gameId lookup for a small, known set (favorites, recently played) — bypasses paging, never used for full-catalog browsing. */
  gameIds?: string[]
  page?: number
  pageSize?: number
}

export interface GamesPage {
  data: Awaited<ReturnType<typeof prisma.game.findMany>>
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

/**
 * The catalog has ~15k games, so this is paginated (offset-based — the
 * catalog is read-mostly, and skip/take keeps filtering by
 * category/provider/search simple). `gameIds` is a separate, unpaginated
 * escape hatch for looking up a specific handful of games by id (favorites,
 * recently played) without pulling in the whole browsing pagination.
 */
export async function listGames(filters: ListGamesFilters = {}): Promise<GamesPage> {
  if (filters.gameIds) {
    if (!filters.gameIds.length) {
      return { data: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 } }
    }

    // Keyed by a hash of the sorted id set, not the caller — most callers
    // (favorites, recently played) pass a unique-per-user set and this just
    // adds a low-value, TTL-bound Redis entry for them. But some callers
    // (Trending) pass the same fixed global set on every request, and that
    // case is common and hot enough to be worth caching properly instead of
    // hitting Postgres on every home-page load.
    const version = await getCatalogVersion()
    const idsHash = crypto.createHash("sha1").update([...filters.gameIds].sort().join(",")).digest("hex")
    const cacheKey = `catalog:v${version}:games:ids:${idsHash}`

    return getOrSetCache(cacheKey, 60, async () => {
      const data = await prisma.game.findMany({
        where: { gameId: { in: filters.gameIds }, enabled: true },
        include: { provider: true, category: true },
        orderBy: { gameName: "asc" },
      })
      return { data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } }
    })
  }

  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(Math.floor(filters.pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE

  const version = await getCatalogVersion()
  const cacheKey = `catalog:v${version}:games:${filters.categoryCode ?? ""}:${filters.providerCode ?? ""}:${filters.search ?? ""}:${page}:${pageSize}`

  return getOrSetCache(cacheKey, 60, async () => {
    const where = {
      enabled: true,
      ...(filters.categoryCode
        ? (() => {
            const group = findMergeGroup(filters.categoryCode)
            return group ? { category: { code: { in: group.sourceCodes } } } : { category: { code: filters.categoryCode } }
          })()
        : {}),
      ...(filters.providerCode ? { provider: { code: filters.providerCode } } : {}),
      ...(filters.search
        ? {
            OR: [
              { gameName: { contains: filters.search, mode: "insensitive" as const } },
              { provider: { name: { contains: filters.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    }

    const [total, data] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        include: { provider: true, category: true },
        // provider.realMoneyVerified first — a player landing on a game
        // whose studio isn't yet confirmed for real-money is exactly the
        // 502 this ordering exists to reduce the odds of. gameName alone
        // isn't unique, so id is a tiebreaker after that — without it, rows
        // can shift between pages when two games share a name.
        orderBy: [{ provider: { realMoneyVerified: "desc" } }, { gameName: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }
  })
}

/** Single-game lookup for the game detail page — matches the provider's own gameId/gameCode exactly, not a slugified name. */
export async function getGameByIdentifier(identifier: string) {
  const version = await getCatalogVersion()
  return getOrSetCache(`catalog:v${version}:game:${identifier}`, 300, () =>
    prisma.game.findFirst({
      where: { enabled: true, OR: [{ gameId: identifier }, { gameCode: identifier }] },
      include: { provider: true, category: true },
    })
  )
}

export async function listCategories() {
  const version = await getCatalogVersion()
  const categories = await getOrSetCache(`catalog:v${version}:categories`, 300, () =>
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  )
  return mergeCategoryGroups(categories)
}

const HOME_FEED_GAMES_PER_CATEGORY = 12

export interface HomeFeedShelf {
  id: string
  code: string
  name: string
  games: Awaited<ReturnType<typeof prisma.game.findMany>>
}

/**
 * The Home page's real bottleneck wasn't any single slow query — it was
 * shape: one shelf per real category (~30 of them), each firing its own
 * `useGames` request from the browser (see frontend CategoryGameRows.tsx),
 * all at once, on every load. Even with each individually fast and
 * Redis-cached, ~30 simultaneous requests stack up against nginx's per-IP
 * burst limit and this process's own per-request overhead. This collapses
 * all of it into one request: every category's first page, fetched via
 * Promise.all *inside* this one call instead of ~30 separate browser round
 * trips, with the assembled result cached under a single Redis key — a warm
 * cache serves the whole Home page's game data with zero Postgres round
 * trips. No pagination metadata needed here (unlike listGames) since each
 * shelf only ever shows its first page.
 */
export async function listHomeFeed(): Promise<HomeFeedShelf[]> {
  const version = await getCatalogVersion()
  return getOrSetCache(`catalog:v${version}:home-feed`, 60, async () => {
    const categories = await listCategories()
    const shelves = await Promise.all(
      categories.map(async (category) => {
        const group = findMergeGroup(category.code)
        const games = await prisma.game.findMany({
          where: { enabled: true, category: { code: group ? { in: group.sourceCodes } : category.code } },
          include: { provider: true, category: true },
          orderBy: [{ provider: { realMoneyVerified: "desc" } }, { gameName: "asc" }, { id: "asc" }],
          take: HOME_FEED_GAMES_PER_CATEGORY,
        })
        return { id: category.id, code: category.code, name: category.name, games }
      })
    )
    // Same rule CategoryRow already applies client-side — skip shelves with nothing synced yet.
    return shelves.filter((shelf) => shelf.games.length > 0)
  })
}
