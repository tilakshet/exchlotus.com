import { prisma } from "../../lib/prisma"
import { logger } from "../../lib/logger"
import { getCatalogVersion, getOrSetCache } from "../../lib/redis"

export interface HeroBannerDto {
  id: string
  backgroundImage: string
  ctaText: string
  linkType: "game" | "page"
  gameSlug: string | null
  path: string | null
}

type PinnedBanner =
  | { kind: "game"; gameId: string; image: string; ctaText: string }
  | { kind: "page"; path: string; image: string; ctaText: string }

/**
 * Curated, not dynamic — see buildHeroBanners below for why. Two kinds of
 * slide: "game" pins straight to a catalog game (resolved against the DB
 * below, same as the old all-games version of this list), "page" is a
 * marketing/promo banner that just navigates to an in-app page and never
 * touches the catalog at all.
 *
 * Art lives in frontend/public/promotion_banner/*.png (swapped in
 * 2026-08-17 from the old frontend/public/hero/*.jpg full-bleed game art —
 * these are general promo banners, not per-game screenshots, hence the
 * "page" link kind for most of them).
 */
const PINNED_BANNERS: PinnedBanner[] = [
  { kind: "game", gameId: "cmsgedoms0mwwuz1dlk6texzt", image: "/promotion_banner/aviator.png", ctaText: "Take Off" }, // Aviator
  { kind: "page", path: "/dashboard/promotions", image: "/promotion_banner/welcome_bonus.png", ctaText: "Claim Bonus" },
  { kind: "page", path: "/dashboard/promotions", image: "/promotion_banner/refer&earn.png", ctaText: "Refer & Earn" },
  { kind: "page", path: "/dashboard/casino", image: "/promotion_banner/casinogames.png", ctaText: "Play Now" },
  { kind: "page", path: "/dashboard/providers", image: "/promotion_banner/category.png", ctaText: "Explore" },
  { kind: "page", path: "/dashboard/live-casino", image: "/promotion_banner/live_casino.png", ctaText: "Play Live" },
  { kind: "page", path: "/dashboard/casino", image: "/promotion_banner/bigwin.png", ctaText: "Play Now" },
]

export async function listHeroBanners(): Promise<HeroBannerDto[]> {
  const version = await getCatalogVersion()
  return getOrSetCache(`catalog:v${version}:hero-banners`, 300, () => buildHeroBanners())
}

async function buildHeroBanners(): Promise<HeroBannerDto[]> {
  const gameIds = PINNED_BANNERS.filter((b) => b.kind === "game").map((b) => b.gameId)
  const games = await prisma.game.findMany({ where: { gameId: { in: gameIds } } })
  const byGameId = new Map(games.map((g) => [g.gameId, g]))

  return PINNED_BANNERS.flatMap((pinned): HeroBannerDto[] => {
    if (pinned.kind === "page") {
      return [{ id: pinned.path, backgroundImage: pinned.image, ctaText: pinned.ctaText, linkType: "page", gameSlug: null, path: pinned.path }]
    }
    const game = byGameId.get(pinned.gameId)
    if (!game) {
      // A pinned game can disappear on resync (provider deactivates it,
      // gameId changes) — skip rather than link a slide to a dead game.
      logger.warn({ gameId: pinned.gameId }, "Pinned hero banner game not found in catalog — skipping slide")
      return []
    }
    return [{ id: pinned.gameId, backgroundImage: pinned.image, ctaText: pinned.ctaText, linkType: "game", gameSlug: game.gameId, path: null }]
  })
}

export interface RecentBigWinDto {
  id: string
  playerHandle: string
  gameName: string
  gameBannerUrl: string | null
  amount: number
  currency: string
  createdAt: string
}

/**
 * Placeholder cutoff for what counts as a "big" win — tune once real
 * traffic/currency mix is known. Recency (not just amount) still bounds
 * this via `take` + `orderBy: createdAt desc`, so the feed reads as "recent
 * big wins", not "biggest wins ever".
 */
const BIG_WIN_THRESHOLD = 500

export async function listRecentBigWins(): Promise<RecentBigWinDto[]> {
  return getOrSetCache("home:recent-big-wins", 30, () => buildRecentBigWins())
}

async function buildRecentBigWins(): Promise<RecentBigWinDto[]> {
  const wins = await prisma.ledgerEntry.findMany({
    where: { type: "WIN", amount: { gte: BIG_WIN_THRESHOLD } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { player: true },
  })

  const games = await prisma.game.findMany({ where: { gameId: { in: [...new Set(wins.map((w) => w.gameId))] } } })
  const byGameId = new Map(games.map((g) => [g.gameId, g]))

  return wins.flatMap((win) => {
    const game = byGameId.get(win.gameId)
    if (!game) return []
    return [
      {
        id: win.id,
        playerHandle: maskUsername(win.player.username),
        gameName: game.gameName,
        gameBannerUrl: game.bannerUrl,
        amount: win.amount.toNumber(),
        currency: win.player.currency,
        createdAt: win.createdAt.toISOString(),
      },
    ]
  })
}

/** "jason92" -> "ja***2" — never show a full username on a public feed. */
function maskUsername(username: string): string {
  if (username.length <= 3) return `${username.charAt(0)}***`
  return `${username.slice(0, 2)}***${username.slice(-1)}`
}
