import { useState } from "react"
import { Heart } from "lucide-react"
import { useFavorites } from "@/hooks/useFavorites"
import { useGames } from "@/hooks/useGames"
import { GameCard } from "@/features/games/GameCard"
import { GameLaunchModal } from "@/features/games/GameLaunchModal"
import { CategoryRowSkeleton } from "./CategoryGameRows"
import type { Game } from "@/types/catalog"

/**
 * Landing page's "Favorite Games" shelf (--landing-* tokens) — same
 * useFavorites()-backed data logic as the dashboard's version
 * (features/games/FavoritesRow.tsx, local-only, see that hook's own doc
 * comment), just restyled for this surface's token set. Hidden entirely
 * whenever there are zero favorites, same as the dashboard.
 */
export function FavoritesRow() {
  const { favorites } = useFavorites()
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)
  const { data, isLoading } = useGames({ ids: favorites })
  const games = data?.data

  if (favorites.length === 0) return null

  if (isLoading) {
    return (
      <div>
        <FavoritesRowTitle />
        <CategoryRowSkeleton />
      </div>
    )
  }

  if (!games || games.length === 0) return null

  return (
    <div>
      <FavoritesRowTitle />
      <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {games.map((game) => (
          <li key={game.id} className="w-48 shrink-0">
            <GameCard game={game} onPlay={setLaunchingGame} />
          </li>
        ))}
      </ul>
      {launchingGame && <GameLaunchModal game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}

function FavoritesRowTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-(--landing-text-primary)">
      <Heart className="size-5.5 shrink-0 fill-red-500 text-red-500" aria-hidden="true" />
      Favorite Games
    </h3>
  )
}
