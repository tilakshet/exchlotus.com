import { useState } from "react"
import { Flame } from "lucide-react"
import { useGames } from "@/hooks/useGames"
import { TRENDING_GAME_IDS } from "@/data/trendingGames"
import { GameCard } from "./GameCard"
import { GameLaunchModal } from "./GameLaunchModal"
import type { Game } from "@/types/catalog"

/** Fixed 3-per-row on mobile, auto-fill `w-48`-ish sizing at `sm:` and up — same grid as the category/search pages (dashboard.category.$categoryCode.tsx, dashboard.search.tsx, GameCatalogSection.tsx). */
const TRENDING_GRID_COLS = "grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4"

function TrendingGridSkeleton() {
  return (
    <div className={`grid ${TRENDING_GRID_COLS}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)]">
          <div className="aspect-[4/3] animate-pulse bg-[color:var(--sb-content-alt)]" />
        </div>
      ))}
    </div>
  )
}

/**
 * Curated grid, same shape as CategoryRow/FavoritesRow — see
 * data/trendingGames.ts for why this is a fixed id list rather than a real
 * "most played" ranking (nothing in this system tracks that).
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
    <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[color:var(--sb-text-primary)]">
      <Flame className="size-5.5 shrink-0 text-[color:var(--sb-accent-gold)]" aria-hidden="true" />
      Trending Games
    </h3>
  )
}
