import { useQuery } from "@tanstack/react-query"
import { getCategories, getHomeFeed } from "@/api/catalog.api"

/** "Promo" is a real synced category (provider-tagged games), but not one the product wants surfaced as a browsable category anywhere — filtered here, once, so every consumer of this hook (rows, hub pages, nav) is promo-free without each needing its own filter. */
const HIDDEN_CATEGORY_CODES = new Set(["promo"])

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const categories = await getCategories()
      return categories.filter((c) => !HIDDEN_CATEGORY_CODES.has(c.code))
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Every category's first page of games in one request, replacing the old
 * pattern of one CategoryRow per category each firing its own useGames call
 * — ~30 simultaneous requests on every Home page load (see backend
 * catalog.service.ts's listHomeFeed doc comment). Same staleTime as
 * useCategories/useGames and the same promo-hiding rule.
 */
export function useHomeFeed() {
  return useQuery({
    queryKey: ["home-feed"],
    queryFn: async () => {
      const shelves = await getHomeFeed()
      return shelves.filter((s) => !HIDDEN_CATEGORY_CODES.has(s.code))
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
