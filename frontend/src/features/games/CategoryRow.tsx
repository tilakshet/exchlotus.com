import { Link } from "@tanstack/react-router"
import { useGames } from "@/hooks/useGames"
import { GameCard } from "./GameCard"
import type { Game } from "@/types/catalog"

export function CategoryRowSkeleton() {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-48 shrink-0 overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)]">
          <div className="aspect-[4/3] animate-pulse bg-[color:var(--sb-content-alt)]" />
        </div>
      ))}
    </div>
  )
}

/**
 * One horizontally-scrolling shelf for a real backend category, with a
 * "More" link to the paginated category-detail page
 * (routes/dashboard.category.$categoryCode.tsx) — the reachable "view all"
 * action every category row needs, not just the first 12 games shown here.
 */
export function CategoryRow({ code, name, onPlay }: { code: string; name: string; onPlay: (game: Game) => void }) {
  const { data, isLoading } = useGames({ category: code, pageSize: 12 })
  const games = data?.data

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[color:var(--sb-text-primary)]">
          <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--sb-accent-gold), transparent)" }} />
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[color:var(--sb-text-primary)]">
          <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--sb-accent-gold), transparent)" }} />
          {name}
        </h3>
        <Link
          to="/dashboard/category/$categoryCode"
          params={{ categoryCode: code }}
          aria-label={`View all ${name} games`}
          className="flex min-h-11 shrink-0 items-center rounded-[var(--sb-radius-sm)] px-2 text-sm font-semibold text-[color:var(--sb-accent-gold)] outline-none transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
        >
          More
        </Link>
      </div>
      <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {games.map((game) => (
          <li key={game.id} className="w-48 shrink-0">
            <GameCard game={game} onPlay={onPlay} />
          </li>
        ))}
      </ul>
    </div>
  )
}
