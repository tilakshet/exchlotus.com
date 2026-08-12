import { apiRequest } from "@/api/http"
import type { RecentBigWin } from "@/types/wins"

export function getRecentBigWins(): Promise<RecentBigWin[]> {
  return apiRequest<RecentBigWin[]>("/api/home/recent-wins", { anonymous: true })
}
