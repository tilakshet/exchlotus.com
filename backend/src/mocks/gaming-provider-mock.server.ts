import express from "express"
import { randomUUID } from "node:crypto"
import { env } from "../lib/env"
import { logger } from "../lib/logger"
import type {
  Campaign,
  GameV2,
  PaginatedResponse,
  ProviderV2,
} from "../modules/provider-integration/gaming-provider/gaming-provider.types"

/**
 * Stands in for the real gaming provider while its actual API hasn't been
 * confirmed reachable/tested (see backend README "Provider integration —
 * v2 endpoint set"). Mounted at the same relative paths
 * (/v1/catalog/providers etc.) under an /api prefix, matching
 * GAMING_PROVIDER_BASE_URL's shape (".../api"). Auth is a single static
 * Bearer key, matching the real provider's documented model — no more
 * OAuth2 token-exchange step to mock.
 *
 * Response shapes here are our own best guess (see
 * gaming-provider.types.ts header) — this mock exists to exercise the
 * plumbing (paths, auth, request/response wiring), not to guarantee it
 * matches the real provider's actual JSON byte-for-byte. Swap
 * GAMING_PROVIDER_BASE_URL to the real domain once it's confirmed
 * reachable and this file stops being imported anywhere.
 */
const app = express()
app.use(express.json())

function requireApiKey(req: express.Request, res: express.Response): boolean {
  const header = req.header("authorization")
  if (header !== `Bearer ${env.GAMING_PROVIDER_API_KEY}`) {
    res.status(401).json({ error: "UNAUTHORIZED" })
    return false
  }
  return true
}

const providers: ProviderV2[] = [
  { id: "prov_pragmatic", name: "Pragmatic Play", is_active: true, games_count: 2 },
  { id: "prov_evolution", name: "Evolution", is_active: true, games_count: 1 },
  { id: "prov_spribe", name: "Spribe", is_active: true, games_count: 0 },
]

const games: GameV2[] = [
  {
    id: "51096",
    name: "Sweet Bonanza",
    identifier: "51096",
    provider_id: "prov_pragmatic",
    provider_name: "Pragmatic Play",
    category: "slots",
    thumbnail: "https://cdn.example.com/assets/banner_51096.png",
    is_active: true,
  },
  {
    id: "51097",
    name: "Gates of Olympus",
    identifier: "51097",
    provider_id: "prov_pragmatic",
    provider_name: "Pragmatic Play",
    category: "slots",
    thumbnail: "https://cdn.example.com/assets/banner_51097.png",
    is_active: true,
  },
  {
    id: "62001",
    name: "Lightning Roulette",
    identifier: "62001",
    provider_id: "prov_evolution",
    provider_name: "Evolution",
    category: "live-casino",
    thumbnail: "https://cdn.example.com/assets/banner_62001.png",
    is_active: true,
  },
]

// In-memory only — resets on restart, this is a mock, not a database.
const campaigns = new Map<string, Campaign>()

/** Matches the real provider's confirmed paginated envelope (see gaming-provider.types.ts). */
function paginate<T>(items: T[], req: express.Request): PaginatedResponse<T> {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.max(1, Number(req.query.page_size) || items.length || 1)
  const start = (page - 1) * pageSize
  return {
    data: items.slice(start, start + pageSize),
    pagination: { page, page_size: pageSize, total: items.length, total_pages: Math.max(1, Math.ceil(items.length / pageSize)) },
  }
}

app.get("/api/v1/catalog/providers", (req, res) => {
  if (!requireApiKey(req, res)) return
  res.json(paginate(providers, req))
})

app.get("/api/v1/catalog/games", (req, res) => {
  if (!requireApiKey(req, res)) return
  const { provider, category } = req.query
  let result = games
  if (typeof provider === "string") result = result.filter((g) => g.provider_id === provider)
  if (typeof category === "string") result = result.filter((g) => g.category === category)
  res.json(paginate(result, req))
})

app.post("/api/v1/sessions/launch", (req, res) => {
  if (!requireApiKey(req, res)) return
  const { gameId, playerId, currency, mode } = req.body ?? {}
  if (!gameId || !playerId || !currency || !mode) {
    return res.status(422).json({ error: "VALIDATION_ERROR", required: ["gameId", "playerId", "currency", "mode"] })
  }
  const sessionId = randomUUID()
  res.json({
    sessionId,
    launchUrl: `https://play.example-provider.test/session/${sessionId}?game=${gameId}&mode=${mode}`,
  })
})

app.get("/api/v1/campaigns", (req, res) => {
  if (!requireApiKey(req, res)) return
  res.json([...campaigns.values()])
})

app.post("/api/v1/campaigns", (req, res) => {
  if (!requireApiKey(req, res)) return
  const { name, gameId, spinsCount } = req.body ?? {}
  if (!name || !gameId || !spinsCount) {
    return res.status(422).json({ error: "VALIDATION_ERROR", required: ["name", "gameId", "spinsCount"] })
  }
  const campaign: Campaign = {
    id: randomUUID(),
    name,
    gameId,
    spinsCount,
    status: "active",
    createdAt: new Date().toISOString(),
  }
  campaigns.set(campaign.id, campaign)
  res.status(201).json(campaign)
})

app.post("/api/v1/campaigns/:id/grant", (req, res) => {
  if (!requireApiKey(req, res)) return
  const campaign = campaigns.get(req.params.id)
  if (!campaign) return res.status(404).json({ error: "NOT_FOUND" })
  const { playerId } = req.body ?? {}
  if (!playerId) return res.status(422).json({ error: "VALIDATION_ERROR", required: ["playerId"] })
  res.json({ grantId: randomUUID(), campaignId: campaign.id, playerId, spinsCount: campaign.spinsCount })
})

app.post("/api/v1/campaigns/:id/revoke", (req, res) => {
  if (!requireApiKey(req, res)) return
  const campaign = campaigns.get(req.params.id)
  if (!campaign) return res.status(404).json({ error: "NOT_FOUND" })
  const { playerId } = req.body ?? {}
  if (!playerId) return res.status(422).json({ error: "VALIDATION_ERROR", required: ["playerId"] })
  res.status(204).send()
})

app.post("/api/v1/campaigns/:id/cancel", (req, res) => {
  if (!requireApiKey(req, res)) return
  const campaign = campaigns.get(req.params.id)
  if (!campaign) return res.status(404).json({ error: "NOT_FOUND" })
  campaign.status = "cancelled"
  res.json(campaign)
})

export function startMockProviderServer() {
  return app.listen(env.MOCK_PROVIDER_PORT, () => {
    logger.info(`Mock gaming provider (v2 endpoint set) listening on http://127.0.0.1:${env.MOCK_PROVIDER_PORT}`)
  })
}

if (require.main === module) {
  startMockProviderServer()
}
