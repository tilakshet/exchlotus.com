import { useInfiniteQuery } from "@tanstack/react-query"
import { getTransactionHistory } from "@/api/wallet.api"
import { useAppSelector } from "@/store"

export function useTransactions(limit = 20) {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)
  return useInfiniteQuery({
    queryKey: ["wallet", "history", { limit }],
    queryFn: ({ pageParam }) => getTransactionHistory({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  })
}
