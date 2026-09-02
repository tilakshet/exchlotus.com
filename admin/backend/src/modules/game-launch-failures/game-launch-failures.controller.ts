import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { runCsvExport } from "../../lib/export"
import { countLaunchFailures, getTopFailingGames, listLaunchFailures } from "./game-launch-failures.service"

export const gameLaunchFailuresRouter = Router()
gameLaunchFailuresRouter.use(requireAdminAuth)

const listQuerySchema = z.object({
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

gameLaunchFailuresRouter.get("/", requirePermission("game-launches.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listLaunchFailures(parsed.data))
})

gameLaunchFailuresRouter.get("/top-games", requirePermission("game-launches.view"), async (_req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  res.json(await getTopFailingGames(since))
})

gameLaunchFailuresRouter.get("/export", requirePermission("game-launches.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { search: parsed.data.search, dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "game-launch-failures",
    filename: `game-launch-failures-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["ID", "Player", "Game ID", "Mode", "Reason", "When"],
    countRows: () => countLaunchFailures(filters),
    fetchPage: (cursor, limit) => listLaunchFailures({ ...filters, cursor, limit }),
    toRow: (item) => [item.id, item.player.username, item.gameId, item.mode, item.reason, item.createdAt],
    filtersForAudit: filters,
  })
})
