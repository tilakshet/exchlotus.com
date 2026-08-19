import { useState } from "react"
import { useCategories } from "@/hooks/useCategories"
import { useGames } from "@/hooks/useGames"
import { GameCard } from "@/features/games/GameCard"
import { GameLaunchModal } from "@/features/games/GameLaunchModal"
import type { Game } from "@/types/catalog"

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

function CategoryRow({ code, name, onPlay }: { code: string; name: string; onPlay: (game: Game) => void }) {
  // Quick-glance row — just the first page, this is a preview shelf, not the browsing surface.
  const { data, isLoading } = useGames({ category: code, pageSize: 12 })
  const games = data?.data

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-(--landing-text-primary)">
          <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--landing-gold-text), transparent)" }} />
          {name}
        </h3>
        <CategoryRowSkeleton />
      </div>
    )
  }

  // Skip categories with nothing synced yet rather than showing an empty shelf.
  if (!games || games.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-(--landing-text-primary)">
        <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--landing-gold-text), transparent)" }} />
        {name}
      </h3>
      <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {games.map((game) => (
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
 * useCategories()/useGames() instead of hardcoded picks. This is the whole
 * game-browsing surface on the landing page — there's no separate "full
 * catalog" grid/search view anymore (dropped in favor of category rows
 * everywhere, including on /dashboard — see features/games/CategoryGameRows.tsx,
 * the dashboard-styled equivalent of this component).
 */
export function CategoryGameRows() {
  const { data: categories, isLoading, isError } = useCategories()
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
      {!isLoading &&
        categories?.map((category) => (
          <CategoryRow key={category.id} code={category.code} name={category.name} onPlay={setLaunchingGame} />
        ))}

      {launchingGame && <GameLaunchModal game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
