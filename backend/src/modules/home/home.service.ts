import { prisma } from "../../lib/prisma"
import { logger } from "../../lib/logger"
import { getCatalogVersion, getOrSetCache } from "../../lib/redis"

export interface HeroBannerDto {
  id: string
  backgroundImage: string
  ctaText: string
  gameSlug: string
}

/**
 * Curated, not dynamic. This used to be "whichever 10 games were most
 * recently synced" with `Game.bannerUrl` (the provider's small catalog
 * thumbnail) stretched full-bleed — different games every sync, and
 * visibly blurry once upscaled to hero-banner size. These 10 are pinned by
 * gameId to real catalog entries, paired with hand-picked high-res art
 * (frontend/public/hero/*.jpg, sized for full-bleed display) that doesn't
 * need any upscaling. HeroSlide only ever renders backgroundImage +
 * ctaText + the Play action (see HeroSlide.tsx) — no other copy survives
 * to the UI, so that's all this DTO carries.
 */
const PINNED_BANNERS: { gameId: string; image: string; ctaText: string }[] = [
  { gameId: "617", image: "/hero/coinflip.jpg", ctaText: "Flip Now" },
  { gameId: "1072", image: "/hero/zeus-of-olympus.jpg", ctaText: "Play Now" },
  { gameId: "56101", image: "/hero/zoomboy.jpg", ctaText: "Play Now" },
  { gameId: "4541", image: "/hero/zoom-roulette.jpg", ctaText: "Spin Now" },
  { gameId: "555", image: "/hero/zoodiac.jpg", ctaText: "Play Now" },
  { gameId: "174", image: "/hero/zombie-siege.jpg", ctaText: "Survive Now" },
  { gameId: "51133", image: "/hero/zombie-outbreak.jpg", ctaText: "Play Now" },
  { gameId: "24154", image: "/hero/zombie-school-megaways.jpg", ctaText: "Play Now" },
  { gameId: "15000", image: "/hero/aviator.jpg", ctaText: "Take Off" },
  { gameId: "10980", image: "/hero/chicken-dash.jpg", ctaText: "Run Now" },
]

export async function listHeroBanners(): Promise<HeroBannerDto[]> {
  const version = await getCatalogVersion()
  return getOrSetCache(`catalog:v${version}:hero-banners`, 300, () => buildHeroBanners())
}

async function buildHeroBanners(): Promise<HeroBannerDto[]> {
  const games = await prisma.game.findMany({ where: { gameId: { in: PINNED_BANNERS.map((b) => b.gameId) } } })
  const byGameId = new Map(games.map((g) => [g.gameId, g]))

  return PINNED_BANNERS.flatMap((pinned) => {
    const game = byGameId.get(pinned.gameId)
    if (!game) {
      // A pinned game can disappear on resync (provider deactivates it,
      // gameId changes) — skip rather than link a slide to a dead game.
      logger.warn({ gameId: pinned.gameId }, "Pinned hero banner game not found in catalog — skipping slide")
      return []
    }
    return [{ id: pinned.gameId, backgroundImage: pinned.image, ctaText: pinned.ctaText, gameSlug: game.gameId }]
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
