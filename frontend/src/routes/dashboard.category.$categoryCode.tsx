import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { useCategories } from "@/hooks/useCategories"
import { useGames } from "@/hooks/useGames"
import { GameCard } from "@/features/games/GameCard"
import { GameLaunchModalConnected } from "@/features/games/GameLaunchModalConnected"
import type { Game } from "@/types/catalog"

interface CategorySearch {
  page?: number
}

const PAGE_SIZE = 24

export const Route = createFileRoute("/dashboard/category/$categoryCode")({
  validateSearch: (search: Record<string, unknown>): CategorySearch => {
    const page = typeof search.page === "number" && search.page >= 1 ? search.page : undefined
    return page ? { page } : {}
  },
  component: CategoryDetailPage,
})

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4">
      {Array.from({ length: PAGE_SIZE }, (_, i) => (
        <div key={i} className="aspect-[4/3] animate-pulse rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]" />
      ))}
    </div>
  )
}

function CategoryDetailPage() {
  const { categoryCode } = Route.useParams()
  const { page = 1 } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  const categoriesQuery = useCategories()
  const category = categoriesQuery.data?.find((c) => c.code === categoryCode)
  const name = category?.name ?? categoryCode

  const gamesQuery = useGames({ category: categoryCode, page, pageSize: PAGE_SIZE })
  const games = gamesQuery.data?.data
  const pagination = gamesQuery.data?.pagination

  function goToPage(nextPage: number) {
    navigate({ search: { page: nextPage } })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to="/dashboard"
          className="flex min-h-11 items-center gap-2 rounded-[var(--sb-radius-sm)] text-sm font-semibold text-[color:var(--sb-text-secondary)] outline-none transition-colors hover:text-[color:var(--sb-text-primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Main Menu
        </Link>
        <h1 className="text-2xl font-bold text-[color:var(--sb-text-primary)]">{name}</h1>
      </div>

      {gamesQuery.isLoading && <GridSkeleton />}

      {gamesQuery.isError && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          Unable to load games.
          <button type="button" onClick={() => gamesQuery.refetch()} className="min-h-11 font-medium underline">
            Try Again
          </button>
        </div>
      )}

      {!gamesQuery.isLoading && !gamesQuery.isError && games?.length === 0 && (
        <p className="text-sm text-[color:var(--sb-text-secondary)]">No {name} games available.</p>
      )}

      {!gamesQuery.isLoading && !gamesQuery.isError && games && games.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} onPlay={setLaunchingGame} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] text-[color:var(--sb-text-primary)] outline-none transition-colors hover:bg-[color:var(--sb-content-alt)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <span className="text-sm text-[color:var(--sb-text-secondary)]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pagination.totalPages}
                aria-label="Next page"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] text-[color:var(--sb-text-primary)] outline-none transition-colors hover:bg-[color:var(--sb-content-alt)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}

      {launchingGame && <GameLaunchModalConnected game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
