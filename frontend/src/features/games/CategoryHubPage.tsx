import { useState } from "react"
import { useCategories } from "@/hooks/useCategories"
import { isLiveCasinoCategory } from "@/lib/categoryGroups"
import { CategoryRow, CategoryRowSkeleton } from "./CategoryRow"
import { GameLaunchModalConnected } from "./GameLaunchModalConnected"
import type { Game } from "@/types/catalog"

/**
 * Shared body for /dashboard/casino and /dashboard/live-casino: the same
 * real-category rows as the Home page, filtered to one group via
 * lib/categoryGroups.ts's heuristic split — no invented categories, only a
 * subset of the real synced ones.
 */
export function CategoryHubPage({ group, title }: { group: "casino" | "live-casino"; title: string }) {
  const { data: categories, isLoading, isError, refetch } = useCategories()
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  const filtered = categories?.filter((category) =>
    group === "live-casino" ? isLiveCasinoCategory(category.code) : !isLiveCasinoCategory(category.code)
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--sb-text-primary)]">{title}</h1>

      <div className="flex flex-col gap-8">
        {isLoading && (
          <>
            <CategoryRowSkeleton />
            <CategoryRowSkeleton />
          </>
        )}

        {isError && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            Unable to load games.
            <button type="button" onClick={() => refetch()} className="min-h-11 font-medium underline">
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered?.length === 0 && (
          <p className="text-sm text-[color:var(--sb-text-secondary)]">No {title} games available.</p>
        )}

        {!isLoading &&
          !isError &&
          filtered?.map((category) => (
            <CategoryRow
              key={category.id}
              code={category.code}
              name={category.name}
              heading={group === "live-casino" ? "Live Casino" : undefined}
              live={group === "live-casino"}
              onPlay={setLaunchingGame}
            />
          ))}

        {launchingGame && <GameLaunchModalConnected game={launchingGame} onClose={() => setLaunchingGame(null)} />}
      </div>
    </div>
  )
}
