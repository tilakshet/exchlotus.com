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
 * Pure presentation — no fetching of its own. Renders one horizontally-
 * scrolling shelf from games already in hand, with a "More" link to the
 * paginated category-detail page (routes/dashboard.category.$categoryCode.tsx).
 * Used directly by CategoryGameRows.tsx (fed from the single batched
 * useHomeFeed() request — see its doc comment for why per-row fetching was
 * replaced there) and wrapped by CategoryRow below (which still fetches its
 * own single category — CategoryHubPage.tsx only ever renders a handful of
 * rows per hub, so that per-row request isn't the N-requests problem
 * useHomeFeed solves on the Home page).
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
export function CategoryRowView({
  code,
  name,
  games,
  heading,
  live,
  onPlay,
}: {
  code: string
  name: string
  games: Game[]
  heading?: string
  live?: boolean
  onPlay: (game: Game) => void
}) {
  const label = heading ?? name

  // Skip categories with nothing synced yet rather than showing an empty shelf.
  if (games.length === 0) return null

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

/**
 * Fetching wrapper around CategoryRowView for a single category — used by
 * CategoryHubPage.tsx (Casino/Live Casino hubs), where each page only ever
 * renders a handful of rows, so a per-row request is fine.
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

  if (isLoading) {
    const label = heading ?? name
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

  return <CategoryRowView code={code} name={name} games={data?.data ?? []} heading={heading} live={live} onPlay={onPlay} />
}
