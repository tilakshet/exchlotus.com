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
 *
 * gameIds are the real provider's own `id` (confirmed 2026-08-14 against
 * the live catalog, matched by game name) — NOT the short numeric ids this
 * list originally shipped with. Those were leftover from a pre-real-sync
 * seed and only ever matched local's database because old rows never get
 * deleted on resync (upsert only inserts/updates); production had already
 * had its catalog truncated + resynced cleanly, so none of them ever
 * existed there, silently skipping every slide (see the "skipping slide"
 * warn log in buildHeroBanners below). No exact "Zeus of Olympus" match
 * exists in the real catalog — substituted with the closest same-theme
 * game ("Zeus") rather than dropping that slide.
 */
const PINNED_BANNERS: { gameId: string; image: string; ctaText: string }[] = [
  { gameId: "cmsge42ze0f56uz1d0grv0m2l", image: "/hero/coinflip.jpg", ctaText: "Flip Now" }, // Coin Flip
  { gameId: "cmsgduljn05vwuz1dc2zbydm8", image: "/hero/zeus-of-olympus.jpg", ctaText: "Play Now" }, // Zeus
  { gameId: "cmsge45hp0f7yuz1dmx56rmgi", image: "/hero/zoomboy.jpg", ctaText: "Play Now" }, // Zoomboy
  { gameId: "cmsgdpq0e00u6uz1di192hicj", image: "/hero/zoom-roulette.jpg", ctaText: "Spin Now" }, // Zoom Roulette
  { gameId: "cmsge3xgm0ezwuz1di66jpq71", image: "/hero/zoodiac.jpg", ctaText: "Play Now" }, // Zoodiac
  { gameId: "cmsge5t9j0gqcuz1dd69v3s0e", image: "/hero/zombie-siege.jpg", ctaText: "Survive Now" }, // Zombie Siege
  { gameId: "cmsgdzqgq0aw6uz1d87do58ar", image: "/hero/zombie-outbreak.jpg", ctaText: "Play Now" }, // Zombie Outbreak
  { gameId: "cmsge54350g1muz1d3xs9hmcr", image: "/hero/zombie-school-megaways.jpg", ctaText: "Play Now" }, // Zombie School Megaways
  { gameId: "cmsgedoms0mwwuz1dlk6texzt", image: "/hero/aviator.jpg", ctaText: "Take Off" }, // Aviator
  { gameId: "cmsge5sg50gpguz1d3zqrwq6e", image: "/hero/chicken-dash.jpg", ctaText: "Run Now" }, // Chicken Dash
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
