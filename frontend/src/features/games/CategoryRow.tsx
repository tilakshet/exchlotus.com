import { Link } from "@tanstack/react-router"
import { useGames } from "@/hooks/useGames"
import { GameCard } from "./GameCard"
import type { Game } from "@/types/catalog"

export function CategoryRowSkeleton() {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-28 shrink-0 overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] sm:w-48">
          <div className="aspect-[4/3] animate-pulse bg-[color:var(--sb-content-alt)]" />
        </div>
      ))}
    </div>
  )
}

/**
 * Pulsing green "live" dot — same ping+dot treatment as the "N Playing"
 * badge on GameCard (useLivePlayingCount.ts), reused here as a live-casino
 * shelf indicator instead of a social-proof count.
 */
function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color:var(--brand-green-text)] opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-[color:var(--brand-green-text)]" />
    </span>
  )
}

/**
 * One horizontally-scrolling shelf for a real backend category, with a
 * "More" link to the paginated category-detail page
 * (routes/dashboard.category.$categoryCode.tsx) — the reachable "view all"
 * action every category row needs, not just the first 12 games shown here.
 *
 * `heading` overrides just the visible H3 text (falls back to `name`) — used
 * by the /dashboard/live-casino hub to show "Live Casino" on every shelf
 * regardless of the underlying category, while `name` still drives the
 * "More" link's aria-label and the empty-state message so those stay
 * specific to the real category. `live` adds the green pulsing dot next to
 * the heading — GameCard adds that same dot to individual cards on its own
 * (derived from each game's real category), so this only ever needs to
 * carry the heading-level flag.
 */
export function CategoryRow({
  code,
  name,
  heading,
  live,
  onPlay,
}: {
  code: string
  name: string
  heading?: string
  live?: boolean
  onPlay: (game: Game) => void
}) {
  const { data, isLoading } = useGames({ category: code, pageSize: 12 })
  const games = data?.data
  const label = heading ?? name

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[color:var(--sb-text-primary)]">
          <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--sb-accent-gold), transparent)" }} />
          {label}
          {live && <LiveDot />}
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
          {label}
          {live && <LiveDot />}
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
          <li key={game.id} className="w-28 shrink-0 sm:w-48">
            <GameCard game={game} onPlay={onPlay} />
          </li>
        ))}
      </ul>
    </div>
  )
}
