import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { runCsvExport } from "../../lib/export"
import { countGames, getGameDetail, listCategories, listGames, listProviders, setGameEnabled } from "./games.service"

export const gamesRouter = Router()
gamesRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

const listQuerySchema = z.object({
  providerCode: z.string().optional(),
  categoryCode: z.string().optional(),
  search: z.string().optional(),
  enabled: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})

gamesRouter.get("/", requirePermission("games.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listGames(parsed.data))
})

gamesRouter.get("/export", requirePermission("games.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { providerCode: parsed.data.providerCode, categoryCode: parsed.data.categoryCode, search: parsed.data.search, enabled: parsed.data.enabled }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "games",
    filename: `games-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Game ID", "Game Code", "Game Name", "Provider", "Category", "Enabled", "RTP"],
    countRows: () => countGames(filters),
    // listGames is offset-paginated (small, read-mostly catalog), unlike
    // ledger/users' cursor pagination — adapt page-number-as-cursor so this
    // reuses the same streamCsv loop as the others instead of a bespoke one.
    fetchPage: async (cursor, pageSize) => {
      const page = cursor ? Number(cursor) : 1
      const result = await listGames({ ...filters, page, pageSize })
      const nextCursor = page * pageSize < result.pagination.total ? String(page + 1) : null
      return { items: result.items, nextCursor }
    },
    toRow: (item) => [item.gameId, item.gameCode, item.gameName, item.provider.name, item.category?.name ?? "", item.enabled ? "Yes" : "No", item.rtp ?? ""],
    filtersForAudit: filters,
  })
})

gamesRouter.get("/providers", requirePermission("games.view"), async (_req, res) => {
  res.json(await listProviders())
})

gamesRouter.get("/categories", requirePermission("games.view"), async (_req, res) => {
  res.json(await listCategories())
})

gamesRouter.get("/:id", requirePermission("games.view"), async (req, res) => {
  try {
    res.json(await getGameDetail(param(req, "id")))
  } catch (err) {
    sendError(res, err)
  }
})

const enabledSchema = z.object({ enabled: z.boolean(), reason: z.string().min(3).max(500) })

gamesRouter.patch("/:id/enabled", requirePermission("games.manage"), async (req, res) => {
  const parsed = enabledSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const game = await setGameEnabled(req, req.adminAuth!.id, param(req, "id"), parsed.data.enabled, parsed.data.reason)
    res.json({ id: game.id, enabled: game.enabled })
  } catch (err) {
    sendError(res, err)
  }
})
