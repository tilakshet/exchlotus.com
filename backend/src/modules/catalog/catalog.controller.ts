import { Router } from "express"
import { z } from "zod"
import { env } from "../../lib/env"
import { getGameByIdentifier, listCategories, listGames, listHomeFeed, listProviders, syncCatalog } from "./catalog.service"

export const catalogRouter = Router()

catalogRouter.get("/providers", async (_req, res) => {
  res.json(await listProviders())
})

catalogRouter.get("/categories", async (_req, res) => {
  res.json(await listCategories())
})

// Batched replacement for "one /games request per category" (see
// listHomeFeed's doc comment) — the Home page's category rows fetch from
// this instead of each firing their own request.
catalogRouter.get("/home-feed", async (_req, res) => {
  res.json(await listHomeFeed())
})

const listGamesQuerySchema = z.object({
  category: z.string().optional(),
  provider: z.string().optional(),
  search: z.string().optional(),
  // Comma-separated gameIds — an unpaginated lookup for a known small set
  // (favorites, recently played), not for browsing the full catalog.
  ids: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})

catalogRouter.get("/games", async (req, res) => {
  const parsed = listGamesQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  const result = await listGames({
    categoryCode: parsed.data.category,
    providerCode: parsed.data.provider,
    search: parsed.data.search,
    gameIds: parsed.data.ids ? parsed.data.ids.split(",").filter(Boolean) : undefined,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  })
  res.json(result)
})

// Exact gameId/gameCode lookup for the game detail page — not a slugified
// name match, see catalog.service.ts getGameByIdentifier.
catalogRouter.get("/games/:identifier", async (req, res) => {
  const game = await getGameByIdentifier(req.params.identifier)
  if (!game) {
    return res.status(404).json({ error: "NOT_FOUND" })
  }
  res.json(game)
})

// Operator/cron action, not a player-facing endpoint — there's no admin
// role system in this codebase yet (see CLAUDE.md RBAC), so this is gated
// by a static shared secret rather than requireAuth, matching the same
// static-bearer-key pattern already used for GAMING_PROVIDER_API_KEY.
catalogRouter.post("/sync", async (req, res) => {
  const header = req.header("authorization")
  if (header !== `Bearer ${env.CATALOG_SYNC_SECRET}`) {
    return res.status(401).json({ error: "UNAUTHORIZED" })
  }
  const result = await syncCatalog()
  res.json(result)
})
