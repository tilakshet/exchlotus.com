import { useQuery } from "@tanstack/react-query"
import { getTransactionHistory } from "@/api/wallet.api"
import { useAppSelector } from "@/store"

/**
 * Best-effort "recently played": derived from the game IDs on recent BET
 * ledger entries, not a dedicated feature/table. "wallet" (manual
 * deposit/withdraw adjustments) is filtered out since it isn't a game.
 */
export function useRecentlyPlayedGameIds(limit = 5) {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)

  const query = useQuery({
    queryKey: ["wallet", "history", "recent-games"],
    queryFn: () => getTransactionHistory({ limit: 25 }),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  })

  const gameIds: string[] = []
  for (const entry of query.data?.items ?? []) {
    if (entry.type !== "BET" || entry.gameId === "wallet") continue
    if (!gameIds.includes(entry.gameId)) gameIds.push(entry.gameId)
    if (gameIds.length >= limit) break
  }

  return { gameIds, isLoading: query.isLoading }
}
