import { apiRequest } from "./http"
import { ApiError } from "./api-error"
import type { Game, GameFilters, GamesPage } from "@/types/catalog"

export function getGames(filters: GameFilters = {}): Promise<GamesPage> {
  const { ids, ...rest } = filters
  return apiRequest<GamesPage>("/api/catalog/games", {
    query: { ...rest, ids: ids?.length ? ids.join(",") : undefined },
  })
}

export async function getGameByIdentifier(identifier: string): Promise<Game | null> {
  try {
    return await apiRequest<Game>(`/api/catalog/games/${encodeURIComponent(identifier)}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export interface LaunchGameInput {
  gameId: string
  currency: string
  lang: string
  mode: "real" | "fun"
}

export interface LaunchGameResult {
  // The real provider doesn't return a session id at launch time — only in
  // later bet/win webhook payloads — so there's nothing to expose here yet.
  launchUrl: string
}

export function launchGame(input: LaunchGameInput): Promise<LaunchGameResult> {
  return apiRequest<LaunchGameResult>("/api/game-session/launch", { method: "POST", body: input })
}
