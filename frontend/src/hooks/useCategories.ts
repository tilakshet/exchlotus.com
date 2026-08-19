import { useQuery } from "@tanstack/react-query"
import { getCategories } from "@/api/catalog.api"

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
