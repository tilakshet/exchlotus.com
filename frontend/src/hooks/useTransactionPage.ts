import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getTransactionHistory } from "@/api/wallet.api"
import { useAppSelector } from "@/store"

/**
 * A real prev/next-paged view over the same ledger `useTransactions`
 * reads (infinite-scroll shaped, no "previous" concept). This keeps a
 * client-side stack of cursors so "prev" can pop back to one already
 * fetched, matching the explicit pager UI in the account mockups
 * (as opposed to the scroll-to-load list used elsewhere).
 */
export function useTransactionPage(limit = 10) {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined])
  const pageIndex = cursorStack.length - 1
  const cursor = cursorStack[pageIndex]

  const query = useQuery({
    queryKey: ["wallet", "history", "page", { cursor, limit }],
    queryFn: () => getTransactionHistory({ cursor, limit }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    hasNext: !!query.data?.nextCursor,
    hasPrev: pageIndex > 0,
    nextPage: () => {
      const next = query.data?.nextCursor
      if (next) setCursorStack((s) => [...s, next])
    },
    prevPage: () => setCursorStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
  }
}
