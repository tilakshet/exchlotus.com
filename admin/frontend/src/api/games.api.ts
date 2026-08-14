import { apiRequest } from "./http"

export interface Provider {
  id: string
  code: string
  name: string
  rtp: number | null
}

export interface Category {
  id: string
  code: string
  name: string
}

export interface GameRow {
  id: string
  gameId: string
  gameCode: string
  gameName: string
  enabled: boolean
  rtp: number | null
  bannerUrl: string | null
  provider: Provider
  category: Category | null
}

export interface GameStats {
  betCount: number
  betVolume: number
  winCount: number
  winVolume: number
  rtpInPractice: number | null
}

export interface GameDetail extends GameRow {
  stats: GameStats
}

export type ListGamesParams = {
  providerCode?: string
  categoryCode?: string
  search?: string
  enabled?: boolean
  page?: number
  pageSize?: number
}

export function listGames(params: ListGamesParams = {}) {
  return apiRequest<{ items: GameRow[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
    "/admin-api/games",
    {
      query: {
        providerCode: params.providerCode,
        categoryCode: params.categoryCode,
        search: params.search,
        enabled: params.enabled === undefined ? undefined : String(params.enabled),
        page: params.page,
        pageSize: params.pageSize,
      },
    }
  )
}

export function listProviders() {
  return apiRequest<Provider[]>("/admin-api/games/providers")
}

export function listCategories() {
  return apiRequest<Category[]>("/admin-api/games/categories")
}

export function getGame(id: string) {
  return apiRequest<GameDetail>(`/admin-api/games/${id}`)
}

export function setGameEnabled(id: string, enabled: boolean, reason: string) {
  return apiRequest<{ id: string; enabled: boolean }>(`/admin-api/games/${id}/enabled`, {
    method: "PATCH",
    body: { enabled, reason },
  })
}
