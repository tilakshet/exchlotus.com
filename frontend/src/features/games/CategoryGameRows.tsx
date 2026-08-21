import { useState } from "react"
import { useCategories } from "@/hooks/useCategories"
import { CategoryRow, CategoryRowSkeleton } from "./CategoryRow"
import { GameLaunchModal } from "./GameLaunchModal"
import type { Game } from "@/types/catalog"

/**
 * Dashboard's Home overview: one horizontally-scrolling row per real
 * backend category, same data/GameCard as the landing page's version
 * (components/landing/CategoryGameRows.tsx) but styled on the dashboard's
 * --sb-* tokens instead of --landing-* — those two token sets carry
 * different accent colors, so this can't just reuse that component
 * directly without a color mismatch. Each row's "More" link is the
 * reachable "view all" action into the full paginated category (see
 * CategoryRow.tsx) — the Casino/Live Casino hub pages
 * (features/games/CategoryHubPage.tsx) render a filtered subset of the
 * same rows.
 */
export function CategoryGameRows() {
  const { data: categories, isLoading, isError, refetch } = useCategories()
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  return (
    <div className="flex flex-col gap-8">
      {isLoading && (
        <>
          <CategoryRowSkeleton />
          <CategoryRowSkeleton />
        </>
      )}

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          Couldn't load categories.
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading &&
        !isError &&
        categories?.map((category) => (
          <CategoryRow
            key={category.id}
            code={category.code}
            name={category.name}
            heading={category.code === "andarbahar" ? "Live Games" : undefined}
            onPlay={setLaunchingGame}
          />
        ))}

      {launchingGame && <GameLaunchModal game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
