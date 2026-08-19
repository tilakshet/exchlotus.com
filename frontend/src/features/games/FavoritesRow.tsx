import { useState } from "react"
import { Heart } from "lucide-react"
import { useFavorites } from "@/hooks/useFavorites"
import { useGames } from "@/hooks/useGames"
import { CategoryRowSkeleton } from "./CategoryRow"
import { GameCard } from "./GameCard"
import { GameLaunchModal } from "./GameLaunchModal"
import type { Game } from "@/types/catalog"

/**
 * A shelf of the player's own favorited games (heart icon on GameCard),
 * same visual shape as CategoryRow's shelves but sourced from
 * useFavorites() (local-only, see that hook's own doc comment) instead of a
 * real backend category. useGames({ ids }) re-fetches automatically the
 * instant `favorites` changes — toggling a heart on/off elsewhere
 * immediately adds/removes that game here too, no manual refresh needed.
 * Hidden entirely (not an empty-state placeholder) whenever there are zero
 * favorites — nothing actionable to show a player who hasn't favorited
 * anything yet.
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
    <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[color:var(--sb-text-primary)]">
      <Heart className="size-5.5 shrink-0 fill-red-500 text-red-500" aria-hidden="true" />
      Favorite Games
    </h3>
  )
}
