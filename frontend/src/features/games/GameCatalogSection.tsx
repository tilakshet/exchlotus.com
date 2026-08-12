import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import {
  AlertCircle,
  ArrowUpDown,
  Cherry,
  ChevronLeft,
  ChevronRight,
  Club,
  Cpu,
  CircleDot,
  Crosshair,
  Dice5,
  Dices,
  Fish,
  Gamepad2,
  Gift,
  Grid3x3,
  Hash,
  LayoutGrid,
  Layers,
  Loader2,
  MoreHorizontal,
  MousePointerClick,
  Puzzle,
  Rocket,
  Search,
  SlidersHorizontal,
  Smile,
  Spade,
  Swords,
  Table2,
  Target,
  Ticket,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useCategories } from "@/hooks/useCategories"
import { useProviders } from "@/hooks/useProviders"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useGames } from "@/hooks/useGames"
import { useFavorites } from "@/hooks/useFavorites"
import { useRecentlyPlayedGameIds } from "@/hooks/useRecentlyPlayed"
import { GameCard } from "./GameCard"
import { GameLaunchModal } from "./GameLaunchModal"
import type { Game } from "@/types/catalog"

/** Best-effort icon per real category code — purely decorative, falls back to Gamepad2 for anything unmapped. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  andarbahar: Layers,
  arcade: Gamepad2,
  baccarat: Club,
  bingo: Grid3x3,
  blackjack: Spade,
  cards: Layers,
  casual: Smile,
  crashgame: Rocket,
  dice: Dices,
  dragontiger: Swords,
  fish: Fish,
  gameshow: Tv,
  "hi-lo": ArrowUpDown,
  instantgame: Zap,
  interactivegame: MousePointerClick,
  keno: Hash,
  lobby: LayoutGrid,
  lottery: Ticket,
  lotto: Ticket,
  minigame: Puzzle,
  other: MoreHorizontal,
  plinko: CircleDot,
  poker: Club,
  promo: Gift,
  roulette: Target,
  scratchcards: Ticket,
  shooting: Crosshair,
  sicbo: Dice5,
  slot: Cherry,
  slots: Cherry,
  tablegames: Table2,
  teenpatti: Spade,
  topcard: Layers,
  virtual: Cpu,
}

/** Same fixed card width as the category rows (CategoryRow.tsx's `w-48` shelf cards) — auto-fill keeps that size but lets the grid wrap to fill the row instead of leaving a gap. */
const GAME_GRID_COLS = "grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"

function GameGridSkeleton() {
  return (
    <div className={`grid ${GAME_GRID_COLS} gap-3`}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="aspect-[4/3] animate-pulse overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]" />
      ))}
    </div>
  )
}

function GameGrid({ games, onPlay, emptyMessage }: { games: Game[]; onPlay: (game: Game) => void; emptyMessage: string }) {
  if (games.length === 0) {
    return <p className="py-6 text-center text-sm text-[color:var(--sb-text-secondary)]">{emptyMessage}</p>
  }
  return (
    <div className={`grid ${GAME_GRID_COLS} gap-3`}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} onPlay={onPlay} />
      ))}
    </div>
  )
}

/**
 * The real game lobby: live category tabs + provider filter + search wired
 * to the backend catalog (useCategories/useProviders/useGames),
 * plus favorites (local-only, see useFavorites.ts) and recently-played
 * (derived from transaction history, see useRecentlyPlayed.ts) sections
 * above the full grid.
 *
 * The catalog has ~15k games, so "All Games" shows exactly one 50-game
 * page at a time (not an accumulating infinite scroll) — "Load more games"
 * advances to the next page, replacing the grid rather than appending to
 * it, and a Previous control steps back. Switching category/provider/
 * search resets back to page 1 so a stale page number never gets applied
 * to a different filter.
 */
export function GameCatalogSection() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined)
  const [activeProvider, setActiveProvider] = useState<string | undefined>(undefined)
  const [providerInput, setProviderInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  // The input updates instantly (it's what the user sees while typing); the
  // query only re-fires once typing pauses, so the backend isn't hit on
  // every keystroke — at 3 games this is invisible, but the catalog is
  // meant to scale to a real provider feed where that matters.
  const debouncedSearch = useDebouncedValue(search.trim(), 350)
  const categoriesQuery = useCategories()
  const providersQuery = useProviders()

  useEffect(() => {
    setPage(1)
  }, [activeCategory, activeProvider, debouncedSearch])

  const gamesQuery = useGames({ category: activeCategory, provider: activeProvider, search: debouncedSearch || undefined, page, pageSize: 50 })
  const searchPending = search.trim() !== debouncedSearch

  // Text + <datalist> combobox instead of a <select> — with 189 providers, a
  // native dropdown is much less usable than typing. An exact (case-
  // insensitive) name match sets the filter; anything else clears it, so a
  // half-typed query never silently applies a stale filter.
  function handleProviderInputChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setProviderInput(value)
    const match = providersQuery.data?.find((provider) => provider.name.toLowerCase() === value.trim().toLowerCase())
    setActiveProvider(match?.code)
  }

  const { favorites } = useFavorites()
  const { gameIds: recentIds } = useRecentlyPlayedGameIds()
  const favoritesQuery = useGames({ ids: favorites })
  const recentQuery = useGames({ ids: recentIds })

  const allGames = gamesQuery.data?.data ?? []
  const pagination = gamesQuery.data?.pagination
  const totalGames = pagination?.total ?? 0

  const favoriteGames = favoritesQuery.data?.data ?? []
  const recentGames = useMemo(() => {
    const byId = new Map((recentQuery.data?.data ?? []).map((g) => [g.gameId, g]))
    return recentIds.map((id) => byId.get(id)).filter((g): g is Game => !!g)
  }, [recentQuery.data, recentIds])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Game category" className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === undefined}
            onClick={() => setActiveCategory(undefined)}
            className={`flex shrink-0 items-center gap-2 rounded-[var(--sb-radius-md)] border px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] ${
              activeCategory === undefined
                ? "border-[color:var(--sb-accent-gold)] text-[color:var(--sb-accent-gold-fg)]"
                : "border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] text-[color:var(--sb-text-primary)] hover:border-[color:var(--sb-accent-gold)]"
            }`}
            style={activeCategory === undefined ? { background: "var(--sb-accent-gold)" } : undefined}
          >
            <LayoutGrid className="size-5.5 shrink-0" aria-hidden="true" />
            All Games
          </button>
          {categoriesQuery.data?.map((category) => {
            const Icon = CATEGORY_ICONS[category.code] ?? Gamepad2
            const active = activeCategory === category.code
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(category.code)}
                className={`flex shrink-0 items-center gap-2 rounded-[var(--sb-radius-md)] border px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] ${
                  active
                    ? "border-[color:var(--sb-accent-gold)] text-[color:var(--sb-accent-gold-fg)]"
                    : "border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] text-[color:var(--sb-text-primary)] hover:border-[color:var(--sb-accent-gold)]"
                }`}
                style={active ? { background: "var(--sb-accent-gold)" } : undefined}
              >
                <Icon className="size-5.5 shrink-0" aria-hidden="true" />
                {category.name}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="game-search" className="sr-only">
            Search games
          </label>
          <div className="flex flex-1 items-center gap-2.5 rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] px-4 py-3">
            <Search className="size-5.5 shrink-0 text-[color:var(--sb-text-secondary)]" aria-hidden="true" />
            <input
              id="game-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Game"
              className="w-full bg-transparent text-sm text-[color:var(--sb-text-primary)] outline-none placeholder:text-[color:var(--sb-text-secondary)]"
            />
            {searchPending && <Loader2 className="size-5.5 shrink-0 animate-spin text-[color:var(--sb-text-secondary)]" aria-hidden="true" />}
          </div>

          <label htmlFor="game-provider-filter" className="sr-only">
            Search providers
          </label>
          <div className="flex flex-1 items-center gap-2.5 rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] px-4 py-3">
            <SlidersHorizontal className="size-5.5 shrink-0 text-[color:var(--sb-text-secondary)]" aria-hidden="true" />
            <input
              id="game-provider-filter"
              type="text"
              list="game-provider-options"
              value={providerInput}
              onChange={handleProviderInputChange}
              placeholder="Search Providers"
              className="w-full bg-transparent text-sm text-[color:var(--sb-text-primary)] outline-none placeholder:text-[color:var(--sb-text-secondary)]"
            />
            <datalist id="game-provider-options">
              {providersQuery.data?.map((provider) => (
                <option key={provider.id} value={provider.name} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {recentGames.length > 0 && (
        <section aria-labelledby="recently-played-heading">
          <h2 id="recently-played-heading" className="mb-3 text-sm font-semibold text-[color:var(--sb-text-primary)]">
            Recently Played
          </h2>
          <GameGrid games={recentGames} onPlay={setLaunchingGame} emptyMessage="" />
        </section>
      )}

      {favoriteGames.length > 0 && (
        <section aria-labelledby="favorites-heading">
          <h2 id="favorites-heading" className="mb-3 text-sm font-semibold text-[color:var(--sb-text-primary)]">
            Favorites
          </h2>
          <GameGrid games={favoriteGames} onPlay={setLaunchingGame} emptyMessage="" />
        </section>
      )}

      <section aria-labelledby="all-games-heading">
        <h2 id="all-games-heading" className="mb-3 text-sm font-semibold text-[color:var(--sb-text-primary)]">
          {activeCategory ? categoriesQuery.data?.find((c) => c.code === activeCategory)?.name : "All Games"}
          {!gamesQuery.isLoading && !gamesQuery.isError && totalGames > 0 && (
            <span className="ml-2 font-normal text-[color:var(--sb-text-secondary)]">({totalGames.toLocaleString()})</span>
          )}
        </h2>

        {gamesQuery.isLoading && <GameGridSkeleton />}

        {gamesQuery.isError && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <span className="flex items-center gap-2">
              <AlertCircle className="size-5.5 shrink-0" aria-hidden="true" />
              Couldn't load games.
            </span>
            <button type="button" onClick={() => gamesQuery.refetch()} className="font-medium underline">
              Retry
            </button>
          </div>
        )}

        {!gamesQuery.isLoading && !gamesQuery.isError && (
          <>
            <GameGrid games={allGames} onPlay={setLaunchingGame} emptyMessage="No games available." />

            {allGames.length > 0 && pagination && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    aria-label="Previous 50 games"
                    className="flex min-h-13 items-center justify-center gap-2 rounded-[var(--sb-radius-full)] border-2 border-[color:var(--sb-border)] px-6 py-3 text-sm font-bold text-[color:var(--sb-text-primary)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--sb-accent-gold)] hover:bg-[color:var(--sb-accent-gold)]/10 hover:text-[color:var(--sb-accent-gold)] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <ChevronLeft className="size-5.5 shrink-0" aria-hidden="true" />
                    Previous
                  </button>

                  {page < pagination.totalPages ? (
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={gamesQuery.isFetching}
                      className="flex min-h-13 items-center justify-center gap-2 rounded-[var(--sb-radius-full)] px-7 py-3 text-sm font-bold text-[color:var(--sb-accent-gold-fg)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 hover:shadow-[0_10px_30px_-10px_var(--sb-accent-gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] disabled:pointer-events-none disabled:opacity-60"
                      style={{ background: "var(--sb-accent-gold)" }}
                    >
                      {gamesQuery.isFetching ? "Loading…" : "Load more games"}
                      {!gamesQuery.isFetching && <ChevronRight className="size-5.5 shrink-0" aria-hidden="true" />}
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-xs font-semibold text-[color:var(--sb-text-secondary)]">No more games</span>
                  )}
                </div>
                <p className="text-xs text-[color:var(--sb-text-secondary)]">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, totalGames)} of{" "}
                  {totalGames.toLocaleString()} games
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {launchingGame && <GameLaunchModal game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
