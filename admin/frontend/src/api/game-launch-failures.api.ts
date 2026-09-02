import { apiRequest } from "./http"

export interface GameLaunchFailureItem {
  id: string
  player: { id: string; username: string; phone: string | null }
  gameId: string
  mode: string
  reason: string
  createdAt: string
}

export function listLaunchFailures(params: { search?: string; dateFrom?: string; dateTo?: string; cursor?: string; limit?: number } = {}) {
  return apiRequest<{ items: GameLaunchFailureItem[]; nextCursor: string | null }>("/admin-api/game-launch-failures", { query: params })
}

export function getTopFailingGames() {
  return apiRequest<{ gameId: string; count: number }[]>("/admin-api/game-launch-failures/top-games")
}
