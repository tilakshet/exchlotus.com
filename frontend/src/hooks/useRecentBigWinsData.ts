import { useQueries } from "@tanstack/react-query"
import { useCategories } from "@/hooks/useCategories"
import { useRecentBigWins } from "@/hooks/useRecentBigWins"
import { getGames } from "@/api/games.api"

export interface WinCardData {
  id: string
  image: string | null
  name: string
  amount: number
}

/** Deterministic per-category pseudo-amount — same category always shows the same figure, no backend call needed. */
function dummyAmount(code: string): number {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  return 45000 + (hash % 955000)
}

/**
 * Shared data logic behind the "Recent Big Wins" ticker on both the
 * dashboard (features/wins/RecentBigWinsRow.tsx) and the landing page
 * (components/landing/RecentBigWinsRow.tsx) — same behavior on both
 * surfaces, only the presentation/tokens differ per surface. Tries the
 * real feed first (wallet ledger WIN entries — see backend
 * home.service.ts), and only while that's genuinely empty (a fresh
 * environment has no WIN entries yet) falls back to one real game banner
 * per real category with a deterministic placeholder amount. The dummy
 * path reuses the exact useGames({category, pageSize: 12}) query
 * CategoryRow already issues for the rows below it, so React Query dedupes
 * the requests — no extra network cost from this widget in that case.
 */
export function useRecentBigWinsData() {
  const realWins = useRecentBigWins()
  const useDummy = !realWins.isLoading && !realWins.isError && (realWins.data?.length ?? 0) === 0

  const categoriesQuery = useCategories()
  const categories = useDummy ? categoriesQuery.data : undefined

  const gameQueries = useQueries({
    queries: (categories ?? []).map((category) => ({
      queryKey: ["games", { category: category.code, pageSize: 12 }],
      queryFn: () => getGames({ category: category.code, pageSize: 12 }),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const isLoading = useDummy
    ? categoriesQuery.isLoading || (!!categories && categories.length > 0 && gameQueries.every((q) => q.isLoading))
    : realWins.isLoading

  const isError = useDummy ? categoriesQuery.isError : realWins.isError

  const cards: WinCardData[] = useDummy
    ? (categories ?? []).flatMap((category, index) => {
        const game = gameQueries[index]?.data?.data?.[0]
        if (!game) return []
        return [{ id: category.id, image: game.bannerUrl, name: game.gameName, amount: dummyAmount(category.code) }]
      })
    : (realWins.data ?? []).map((win) => ({ id: win.id, image: win.gameBannerUrl, name: win.gameName, amount: win.amount }))

  return { cards, isLoading, isError }
}
