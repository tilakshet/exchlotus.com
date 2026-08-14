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
    // Per-caller sets of ids (favorites, recently played) — essentially
    // unique per request, so caching them would just fill Redis with
    // one-hit entries. Straight to Postgres.
    const data = filters.gameIds.length
      ? await prisma.game.findMany({
          where: { gameId: { in: filters.gameIds }, enabled: true },
          include: { provider: true, category: true },
          orderBy: { gameName: "asc" },
        })
      : []
    return { data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } }
  }

  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(Math.floor(filters.pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE

  const version = await getCatalogVersion()
  const cacheKey = `catalog:v${version}:games:${filters.categoryCode ?? ""}:${filters.providerCode ?? ""}:${filters.search ?? ""}:${page}:${pageSize}`

  return getOrSetCache(cacheKey, 60, async () => {
    const where = {
      enabled: true,
      ...(filters.categoryCode ? { category: { code: filters.categoryCode } } : {}),
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
        // gameName alone isn't unique, so id is a tiebreaker — without it,
        // rows can shift between pages when two games share a name.
        orderBy: [{ gameName: "asc" }, { id: "asc" }],
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
  return getOrSetCache(`catalog:v${version}:categories`, 300, () =>
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  )
}
