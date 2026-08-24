import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import type {
  Campaign,
  CreateCampaignInput,
  GameV2,
  GrantCampaignInput,
  GrantCampaignResult,
  LaunchSessionInput,
  LaunchSessionResponse,
  ListGamesFilters,
  PaginatedResponse,
  ProviderV2,
  RevokeCampaignInput,
} from "./gaming-provider.types"

/**
 * Outbound half of the provider integration: everything WE call on the
 * gaming provider. The inbound half — everything the provider calls on
 * US (the wallet webhook) — lives in gaming-webhook.service.ts and is
 * UNCHANGED by this file; nothing here touches that.
 *
 * v2 endpoint set: this client was originally built against a pasted
 * "Gaming API Specification v2.4" (OAuth2 agent_token:agent_secret →
 * short-lived access_token, /games/* paths). It has since been repointed
 * at a different, real provider (an API-docs screenshot) with a simpler
 * model: one static API key, sent as `Authorization: Bearer <key>` on
 * every call, no token-exchange step at all. That's why there's no
 * authenticate()/token-caching logic anymore — there's no token to cache,
 * just the one configured key.
 *
 * getProviders()/getGames() are confirmed against the real API (2026-08-07):
 * both endpoints return a paginated envelope (`{ data, pagination }`), so
 * fetchAllPages() below unwraps `data` and keeps requesting subsequent
 * pages (page_size capped at 200 by the provider) until
 * pagination.total_pages is reached.
 */
class GamingProviderClient {
  private readonly MAX_PAGE_SIZE = 200

  // Without this, a provider request that never responds (rather than
  // erroring) hangs the calling request indefinitely — under concurrent
  // real launch-day traffic that ties up connections instead of failing
  // fast, which is worse than a clean error the player can retry from.
  private readonly REQUEST_TIMEOUT_MS = 15_000

  private async authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(`${env.GAMING_PROVIDER_BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${env.GAMING_PROVIDER_API_KEY}`,
        Accept: "application/json",
      },
    })

    if (res.status === 401 || res.status === 403) {
      // Nothing to refresh — a static key rejection means it's invalid,
      // revoked, or the account doesn't have access to this endpoint.
      logger.error({ status: res.status, path }, "Gaming provider rejected the configured API key")
    }

    return res
  }

  /**
   * Walks every page of a paginated /v1/catalog/* endpoint and returns the
   * concatenated `data` arrays. `total_pages` comes from the provider's own
   * response each request — never assumed or hardcoded — so this keeps
   * paging until the provider itself says there's nothing left.
   */
  private async fetchAllPages<T>(path: string, baseQuery: URLSearchParams, label: string): Promise<T[]> {
    const results: T[] = []
    let page = 1
    let totalPages = 1

    do {
      const query = new URLSearchParams(baseQuery)
      query.set("page", String(page))
      query.set("page_size", String(this.MAX_PAGE_SIZE))

      const res = await this.authorizedFetch(`${path}?${query.toString()}`)
      if (!res.ok) {
        logger.error({ status: res.status, path, page }, `Unable to sync ${label}: request failed`)
        throw new Error(`Unable to sync ${label}: request to ${path} (page ${page}) failed with status ${res.status}`)
      }

      const body = (await res.json()) as Partial<PaginatedResponse<T>>
      if (!Array.isArray(body.data)) {
        logger.error({ path, page, body }, `Unable to sync ${label}: response.data was not an array`)
        throw new Error(`Unable to sync ${label}: expected an array inside response.data, got ${typeof body.data}`)
      }

      results.push(...body.data)
      totalPages = body.pagination?.total_pages ?? page
      page += 1
    } while (page <= totalPages)

    return results
  }

  async getProviders(): Promise<ProviderV2[]> {
    return this.fetchAllPages<ProviderV2>("/v1/catalog/providers", new URLSearchParams(), "providers")
  }

  async getGames(filters: ListGamesFilters = {}): Promise<GameV2[]> {
    const query = new URLSearchParams()
    if (filters.provider) query.set("provider", filters.provider)
    if (filters.category) query.set("category", filters.category)
    return this.fetchAllPages<GameV2>("/v1/catalog/games", query, "games")
  }

  // A burst of real players launching games at once (e.g. right as a big
  // match starts) can trip the provider's own rate limiter — that's a
  // transient condition on their end, not a real per-game problem, so it's
  // worth one short retry before surfacing "unavailable" to the player.
  private static readonly LAUNCH_RETRY_DELAYS_MS = [300, 800]

  async launchSession(input: LaunchSessionInput): Promise<LaunchSessionResponse> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.authorizedFetch("/v1/sessions/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        return res.json() as Promise<LaunchSessionResponse>
      }

      const body = await res.json().catch(() => ({}))
      const message = typeof (body as { error?: unknown }).error === "string" ? (body as { error: string }).error : undefined

      if (res.status === 429 && attempt < GamingProviderClient.LAUNCH_RETRY_DELAYS_MS.length) {
        logger.warn({ gameId: input.game_id, mode: input.mode, attempt }, "Gaming provider rate-limited a session launch, retrying")
        await new Promise((resolve) => setTimeout(resolve, GamingProviderClient.LAUNCH_RETRY_DELAYS_MS[attempt]))
        continue
      }

      logger.error({ status: res.status, gameId: input.game_id, mode: input.mode, body }, "Session launch failed")
      throw new Error(`Session launch failed with status ${res.status}${message ? `: ${message}` : ""}`)
    }
  }

  async listCampaigns(): Promise<Campaign[]> {
    const res = await this.authorizedFetch("/v1/campaigns")
    if (!res.ok) throw new Error(`Campaign list fetch failed with status ${res.status}`)
    return res.json() as Promise<Campaign[]>
  }

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const res = await this.authorizedFetch("/v1/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`Campaign creation failed with status ${res.status}`)
    return res.json() as Promise<Campaign>
  }

  async grantCampaign(campaignId: string, input: GrantCampaignInput): Promise<GrantCampaignResult> {
    const res = await this.authorizedFetch(`/v1/campaigns/${campaignId}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`Campaign grant failed with status ${res.status}`)
    return res.json() as Promise<GrantCampaignResult>
  }

  async revokeCampaign(campaignId: string, input: RevokeCampaignInput): Promise<void> {
    const res = await this.authorizedFetch(`/v1/campaigns/${campaignId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`Campaign revoke failed with status ${res.status}`)
  }

  async cancelCampaign(campaignId: string): Promise<Campaign> {
    const res = await this.authorizedFetch(`/v1/campaigns/${campaignId}/cancel`, { method: "POST" })
    if (!res.ok) throw new Error(`Campaign cancel failed with status ${res.status}`)
    return res.json() as Promise<Campaign>
  }
}

export const gamingProviderClient = new GamingProviderClient()
