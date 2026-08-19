import { useState } from "react"
import { Flame } from "lucide-react"
import { useGames } from "@/hooks/useGames"
import { TRENDING_GAME_IDS } from "@/data/trendingGames"
import { GameCard } from "@/features/games/GameCard"
import { GameLaunchModal } from "@/features/games/GameLaunchModal"
import type { Game } from "@/types/catalog"

/** Fixed 3-per-row on mobile, auto-fill `w-48`-ish sizing at `sm:` and up — same grid as the category/search pages (dashboard.category.$categoryCode.tsx, dashboard.search.tsx, GameCatalogSection.tsx). */
const TRENDING_GRID_COLS = "grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4"

function TrendingGridSkeleton() {
  return (
    <div className={`grid ${TRENDING_GRID_COLS}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-(--landing-radius-md) border border-(--landing-border)">
          <div className="aspect-[4/3] animate-pulse bg-(--landing-bg-3)" />
        </div>
      ))}
    </div>
  )
}

/**
 * Landing page's "Trending Games" grid (--landing-* tokens) — same curated
 * id list and data logic as the dashboard's version
 * (features/games/TrendingGamesRow.tsx), just restyled for this surface's
 * token set. See data/trendingGames.ts for why this is a fixed id list
 * rather than a real "most played" ranking.
 */
export function TrendingGamesRow() {
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)
  const { data, isLoading } = useGames({ ids: [...TRENDING_GAME_IDS] })
  const games = data?.data

  if (isLoading) {
    return (
      <div>
        <TrendingGamesRowTitle />
        <TrendingGridSkeleton />
      </div>
    )
  }

  if (!games || games.length === 0) return null

  return (
    <div>
      <TrendingGamesRowTitle />
      <ul className={`grid ${TRENDING_GRID_COLS}`}>
        {games.map((game) => (
          <li key={game.id}>
            <GameCard game={game} onPlay={setLaunchingGame} />
          </li>
        ))}
      </ul>
      {launchingGame && <GameLaunchModal game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}

function TrendingGamesRowTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-(--landing-text-primary)">
      <Flame className="size-5.5 shrink-0 text-(--landing-gold)" aria-hidden="true" />
      Trending Games
    </h3>
  )
}
