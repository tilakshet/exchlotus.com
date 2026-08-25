import { useState } from "react"
import { useHomeFeed } from "@/hooks/useCategories"
import { GameCard } from "@/features/games/GameCard"
import { GameLaunchModalConnected } from "@/features/games/GameLaunchModalConnected"
import type { Game, HomeFeedShelf } from "@/types/catalog"

export function CategoryRowSkeleton() {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-28 shrink-0 overflow-hidden rounded-(--landing-radius-md) border border-(--landing-border) sm:w-48">
          <div className="aspect-[4/3] animate-pulse bg-(--landing-bg-3)" />
        </div>
      ))}
    </div>
  )
}

function CategoryRow({ shelf, onPlay }: { shelf: HomeFeedShelf; onPlay: (game: Game) => void }) {
  // Skip categories with nothing synced yet rather than showing an empty shelf.
  if (shelf.games.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-(--landing-text-primary)">
        <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--landing-gold-text), transparent)" }} />
        {shelf.name}
      </h3>
      <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {shelf.games.map((game) => (
          <li key={game.id} className="w-28 shrink-0 sm:w-48">
            <GameCard game={game} onPlay={onPlay} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Quick-glance horizontal rows, one per real backend category — the
 * "Trending / Live Casino / Casino" preview pattern, but built from
 * useHomeFeed() instead of hardcoded picks. This is the whole game-browsing
 * surface on the landing page — there's no separate "full catalog"
 * grid/search view anymore (dropped in favor of category rows everywhere,
 * including on /dashboard — see features/games/CategoryGameRows.tsx, the
 * dashboard-styled equivalent of this component).
 *
 * Fed from one batched useHomeFeed() request instead of each row fetching
 * its own category — ~30 categories firing ~30 simultaneous requests on
 * every load was the actual cause of the slow initial load (see backend
 * catalog.service.ts's listHomeFeed doc comment).
 */
export function CategoryGameRows() {
  const { data: shelves, isLoading, isError } = useHomeFeed()
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  if (isError) return null

  return (
    <div className="flex flex-col gap-8">
      {isLoading && (
        <>
          <CategoryRowSkeleton />
          <CategoryRowSkeleton />
        </>
      )}
      {!isLoading && shelves?.map((shelf) => <CategoryRow key={shelf.id} shelf={shelf} onPlay={setLaunchingGame} />)}

      {launchingGame && <GameLaunchModalConnected game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
