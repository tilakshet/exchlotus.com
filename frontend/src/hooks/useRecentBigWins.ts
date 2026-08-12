import { useQuery } from "@tanstack/react-query"
import { getRecentBigWins } from "@/services/winsApi"

/** Short staleTime + a poll interval — this is meant to feel live. */
export function useRecentBigWins() {
  return useQuery({
    queryKey: ["home", "recent-wins"],
    queryFn: getRecentBigWins,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
  })
}
