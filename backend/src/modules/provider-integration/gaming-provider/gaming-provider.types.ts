/**
 * Types for the provider's v2 endpoint set (static API-key auth, /v1/*
 * paths — see gaming-provider.client.ts header comment for how this
 * differs from the original OAuth2-based spec this integration started
 * against).
 *
 * Confirmed against the real API response (2026-08-07) — /v1/catalog/providers
 * and /v1/catalog/games both return a paginated envelope (PaginatedResponse<T>
 * below), not a bare array, and games use snake_case field names
 * (provider_id, thumbnail), not the camelCase originally guessed here.
 */

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface ProviderV2 {
  id: string
  name: string
  is_active: boolean
  games_count: number
}

export interface GameV2 {
  id: string
  name: string
  identifier: string
  provider_id: string
  provider_name: string
  category?: string
  thumbnail?: string
  is_active: boolean
}

export interface ListGamesFilters {
  provider?: string
  category?: string
}

/**
 * Confirmed against the real API (2026-08-08): the request is snake_case
 * (game_id/user_id, not gameId/playerId — the provider's own 400 response
 * names the fields it expects), and the success response is `{ game_url,
 * session }`, not `{ launchUrl, sessionId }` — there is no session id
 * returned at launch time at all; the provider only starts sending one
 * back in the transaction_bet/transaction_win webhook payloads.
 */
export interface LaunchSessionInput {
  game_id: string
  user_id: string
  user_name: string
  currency: string
  /** ISO language code (e.g. "en"). Required per the provider's launch spec — see LaunchSessionRequest header comment. */
  lang: string
  mode: "real" | "fun"
}

export interface LaunchSessionResponse {
  game_url: string
  session?: {
    user_id: string
    game_id: string
    currency: string
    mode: "real" | "fun"
  }
}

export interface Campaign {
  id: string
  name: string
  gameId: string
  spinsCount: number
  status: "active" | "cancelled" | "expired"
  createdAt: string
}

export interface CreateCampaignInput {
  name: string
  gameId: string
  spinsCount: number
  /** ISO date the campaign's grants stop being redeemable. Optional — assumed, unconfirmed. */
  expiresAt?: string
}

export interface GrantCampaignInput {
  playerId: string
}

export interface GrantCampaignResult {
  grantId: string
  campaignId: string
  playerId: string
  spinsCount: number
}

export interface RevokeCampaignInput {
  playerId: string
}
