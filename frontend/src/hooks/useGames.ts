import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query"
import { getGameByIdentifier, getGames, launchGame, type LaunchGameInput } from "@/api/games.api"
import type { GameFilters } from "@/types/catalog"

/**
 * Bounded lookups only — a single page or a small explicit id set
 * (favorites, recently played). Not for browsing the full catalog.
 * When `ids` is explicitly passed as an empty array, the query is skipped
 * entirely rather than falling through to an unfiltered page of the catalog.
 */
export function useGames(filters: GameFilters = {}) {
  const emptyIdLookup = filters.ids !== undefined && filters.ids.length === 0
  return useQuery({
    queryKey: ["games", filters],
    queryFn: () => getGames(filters),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !emptyIdLookup,
  })
}

const GAMES_PAGE_SIZE = 50

/** Paginated catalog browsing — fetches one page at a time via TanStack Query's infinite-query cache, driven by GameCatalogSection's "load more" / scroll trigger. */
export function useInfiniteGames(filters: Omit<GameFilters, "page" | "pageSize" | "ids"> = {}) {
  return useInfiniteQuery({
    queryKey: ["games", "infinite", filters],
    queryFn: ({ pageParam }) => getGames({ ...filters, page: pageParam, pageSize: GAMES_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

export function useGameBySlug(slug: string) {
  return useQuery({
    queryKey: ["game", slug],
    queryFn: () => getGameByIdentifier(slug),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: slug.length > 0,
  })
}

export function useLaunchGame() {
  return useMutation({
    mutationFn: (input: LaunchGameInput) => launchGame(input),
  })
}
