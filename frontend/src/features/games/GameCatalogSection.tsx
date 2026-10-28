import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { AlertCircle, Cherry, ChevronLeft, ChevronRight, CircleDot, Club, Crosshair, Dice5, Gamepad2, Grid3X3, Layers, Loader2, Rocket, Search, SlidersHorizontal, Table2, Ticket, Tv, Zap, type LucideIcon } from "lucide-react"
import { useCategories } from "@/hooks/useCategories"
import { useProviders } from "@/hooks/useProviders"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useGames } from "@/hooks/useGames"
import { useFavorites } from "@/hooks/useFavorites"
import { useRecentlyPlayedGameIds } from "@/hooks/useRecentlyPlayed"
import { GameCard } from "./GameCard"
import { GameLaunchModalConnected } from "./GameLaunchModalConnected"
import type { Game } from "@/types/catalog"

/** Provider category codes grouped into player-friendly browse headings. */
const GAME_CATEGORY_GROUPS: { label: string; codes: Set<string> }[] = [
  { label: "Slots", codes: new Set(["slot", "slots"]) },
  { label: "Live Casino & Table Games", codes: new Set(["andarbahar", "baccarat", "blackjack", "cards", "dragontiger", "gameshow", "poker", "roulette", "sicbo", "tablegames", "teenpatti"]) },
  { label: "Quick Games", codes: new Set(["crashgame", "dice", "hi-lo", "instantgame", "interactivegame", "keno", "lottery", "lotto", "plinko", "scratchcards"]) },
  { label: "Arcade & Casual", codes: new Set(["arcade", "casual", "fish", "minigame", "shooting"]) },
]
const GAME_CATEGORY_LABELS: Record<string, string> = {
  andarbahar: "Andar Bahar",
  crashgame: "Crash Games",
  dragontiger: "Dragon Tiger",
  gameshow: "Game Shows",
  "hi-lo": "Hi-Lo",
  instantgame: "Instant Games",
  interactivegame: "Interactive Games",
  keno: "Keno",
  lottery: "Lotteries",
  minigame: "Mini Games",
  scratchcards: "Scratch Cards",
  slots: "Slots",
  slot: "Slots",
  tablegames: "Table Games",
  teenpatti: "Teen Patti",
}
const GAME_CATEGORY_ICONS: Record<string, LucideIcon> = {
  "all-games": Grid3X3,
  "crash-games": Rocket,
  "table-games": Table2,
  poker: Club,
  lotteries: Ticket,
  "live-casino": Tv,
  "quick-games": Zap,
  arcade: Gamepad2,
  crashgame: Rocket,
  dice: Dice5,
  roulette: CircleDot,
  slot: Cherry,
  slots: Cherry,
  shooting: Crosshair,
  cards: Layers,
  andarbahar: Club,
}

function categoryGroup(code: string) {
  return GAME_CATEGORY_GROUPS.find((group) => group.codes.has(code))?.label ?? "Other Games"
}

const GAME_GRID_COLS = "grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"
const BROWSE_GROUP_LABELS: Record<string, string> = {
  "live-casino": "Live Casino",
  "quick-games": "Quick Games",
  "crash-games": "Crash Games",
  "table-games": "Table Games",
  lotteries: "Lotteries",
  ...GAME_CATEGORY_LABELS,
}
const ORDERED_CASINO_TABS = [
  { code: "", label: "All Games" },
  { code: "crash-games", label: "Crash Games" },
  { code: "table-games", label: "Table Games" },
  { code: "poker", label: "Poker" },
  { code: "dice", label: "Dice" },
  { code: "lotteries", label: "Lotteries" },
  { code: "roulette", label: "Roulette" },
  { code: "slots", label: "Slots" },
  { code: "shooting", label: "Shooting" },
  { code: "cards", label: "Cards" },
  { code: "andarbahar", label: "Andar Bahar" },
  { code: "live-casino", label: "Live Casino" },
  { code: "quick-games", label: "Quick Games" },
]
const ORDERED_CASINO_CATEGORY_CODES = new Set([
  "crashgame", "tablegames", "poker", "dice", "lottery", "lotto", "roulette",
  "slot", "slots", "shooting", "cards", "andarbahar",
])

function GameCarouselSkeleton() {
  return (
    <div className="scrollbar-none flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-36 shrink-0 overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] sm:w-48">
          <div className="aspect-[4/3] animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} className="aspect-[4/3] animate-pulse rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]" />
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
 * The real game lobby: category filter + provider filter + search wired
 * to the backend catalog (useCategories/useProviders/useGames),
 * plus favorites (local-only, see useFavorites.ts) and recently-played
 * (derived from transaction history, see useRecentlyPlayed.ts) sections
 * above the catalog. Casino mode uses category tabs and a 25-game grid page;
 * the landing catalog uses a 50-game horizontal carousel page.
 *
 * The catalog has ~15k games, so "All Games" shows exactly one 50-game
 * page at a time (not an accumulating infinite scroll) — "Load more games"
 * advances to the next carousel page rather than appending to
 * it, and a Previous control steps back. Switching category/provider/
 * search resets back to page 1 so a stale page number never gets applied
 * to a different filter.
 */
export function GameCatalogSection({
  casinoMode = false,
  showCategoryTabs = false,
  initialCategory,
}: {
  casinoMode?: boolean
  showCategoryTabs?: boolean
  initialCategory?: string
}) {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(initialCategory)
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

  const pageSize = casinoMode ? 24 : 50
  const gamesQuery = useGames({ category: activeCategory, provider: activeProvider, search: debouncedSearch || undefined, page, pageSize })
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
  const casinoTabs = [
    ...ORDERED_CASINO_TABS,
    ...(categoriesQuery.data ?? [])
      .filter((category) => !ORDERED_CASINO_CATEGORY_CODES.has(category.code))
      .map((category) => ({ code: category.code, label: GAME_CATEGORY_LABELS[category.code] ?? category.name })),
  ].filter((tab, index, tabs) => tabs.findIndex((item) => item.code === tab.code) === index)
  if (!casinoMode) casinoTabs[0].label = "All Games"

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {casinoMode || showCategoryTabs ? (
          <div role="tablist" aria-label="Casino game categories" className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
            {casinoTabs.map((tab) => {
              const active = (activeCategory ?? "") === tab.code
              const Icon = GAME_CATEGORY_ICONS[tab.code || "all-games"] ?? Gamepad2
              return (
                <button
                  key={tab.code || "all-casino-games"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(tab.code || undefined)}
                  className={`flex min-h-14 shrink-0 items-center gap-2.5 rounded-[14px] border border-transparent px-5 text-base font-semibold text-white transition-colors duration-150 hover:bg-[#00c853] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c853] ${active ? "!bg-[#00c853] shadow-md" : "bg-[#292929]"}`}
                >
                  <Icon className={`size-5.5 shrink-0 ${active ? "text-white" : "text-white/65"}`} aria-hidden="true" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <label htmlFor="game-category-filter" className="sr-only">Browse game category</label>
            <select
              id="game-category-filter"
              value={activeCategory ?? ""}
              onChange={(event) => setActiveCategory(event.target.value || undefined)}
              className="min-h-11 w-full rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] px-3 text-sm font-semibold text-[color:var(--sb-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] sm:w-auto sm:min-w-64"
            >
              <option value="">All Games</option>
              {GAME_CATEGORY_GROUPS.map((group) => {
                const categories = categoriesQuery.data?.filter((category) => categoryGroup(category.code) === group.label) ?? []
                return categories.length ? (
                  <optgroup key={group.label} label={group.label}>
                    {categories.map((category) => <option key={category.id} value={category.code}>{category.name}</option>)}
                  </optgroup>
                ) : null
              })}
              {categoriesQuery.data?.filter((category) => categoryGroup(category.code) === "Other Games").map((category) => (
                <option key={category.id} value={category.code}>{category.name}</option>
              ))}
            </select>
          </>
        )}

        {!casinoMode && <div className="flex flex-col gap-3 sm:flex-row">
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
        </div>}
      </div>

      {!casinoMode && recentGames.length > 0 && (
        <section aria-labelledby="recently-played-heading">
          <h2 id="recently-played-heading" className="mb-3 text-sm font-semibold text-[color:var(--sb-text-primary)]">
            Recently Played
          </h2>
          <GameGrid games={recentGames} onPlay={setLaunchingGame} emptyMessage="" />
        </section>
      )}

      {!casinoMode && favoriteGames.length > 0 && (
        <section aria-labelledby="favorites-heading">
          <h2 id="favorites-heading" className="mb-3 text-sm font-semibold text-[color:var(--sb-text-primary)]">
            Favorites
          </h2>
          <GameGrid games={favoriteGames} onPlay={setLaunchingGame} emptyMessage="" />
        </section>
      )}

      <section aria-labelledby="all-games-heading">
        <h2 id="all-games-heading" className="mb-3 text-sm font-semibold text-[color:var(--sb-text-primary)]">
          {activeCategory
            ? (BROWSE_GROUP_LABELS[activeCategory] ?? categoriesQuery.data?.find((c) => c.code === activeCategory)?.name)
            : casinoMode ? "All Casino Games" : "All Games"}
          {!gamesQuery.isLoading && !gamesQuery.isError && totalGames > 0 && (
            <span className="ml-2 font-normal text-[color:var(--sb-text-secondary)]">({totalGames.toLocaleString()})</span>
          )}
        </h2>

        {gamesQuery.isLoading && (casinoMode ? <GameGridSkeleton /> : <GameCarouselSkeleton />)}

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
            {casinoMode ? (
              <GameGrid games={allGames} onPlay={setLaunchingGame} emptyMessage="No games available." />
            ) : allGames.length === 0 ? (
              <p className="py-6 text-center text-sm text-[color:var(--sb-text-secondary)]">No games available.</p>
            ) : (
              <ul aria-label="Catalog games" className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
                {allGames.map((game) => (
                  <li key={game.id} className="w-36 shrink-0 sm:w-48">
                    <GameCard game={game} onPlay={setLaunchingGame} />
                  </li>
                ))}
              </ul>
            )}

            {allGames.length > 0 && pagination && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    aria-label={`Previous ${pageSize} games`}
                    className="flex min-h-13 items-center justify-center gap-2 rounded-[var(--sb-radius-full)] border-2 border-[color:var(--sb-border)] px-6 py-3 text-sm font-bold text-[color:var(--sb-text-primary)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--sb-accent-gold)] hover:bg-[color:var(--sb-accent-gold)]/10 hover:text-[color:var(--sb-accent-gold)] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <ChevronLeft className="size-5.5 shrink-0" aria-hidden="true" />
                    {casinoMode ? "Previous page" : "Previous"}
                  </button>

                  {page < pagination.totalPages ? (
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={gamesQuery.isFetching}
                      className="flex min-h-13 items-center justify-center gap-2 rounded-[var(--sb-radius-full)] px-7 py-3 text-sm font-bold text-[color:var(--sb-accent-gold-fg)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 hover:shadow-[0_10px_30px_-10px_var(--sb-accent-gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] disabled:pointer-events-none disabled:opacity-60"
                      style={{ background: "var(--sb-accent-gold)" }}
                    >
                      {gamesQuery.isFetching ? "Loading…" : casinoMode ? "Next page" : "Load more games"}
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

      {launchingGame && <GameLaunchModalConnected game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
