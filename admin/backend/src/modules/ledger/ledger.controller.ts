import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { runCsvExport } from "../../lib/export"
import { countGlobalLedger, listGlobalLedger } from "./ledger.service"

export const ledgerRouter = Router()
ledgerRouter.use(requireAdminAuth)

const LEDGER_TYPES = ["BET", "WIN", "REFUND", "ADJUSTMENT", "DEPOSIT", "WITHDRAWAL"] as const
const ledgerType = z.enum(LEDGER_TYPES)

// Accepts ?type=DEPOSIT, ?type=BET,WIN,REFUND (comma-separated), or repeated
// ?type=BET&type=WIN (Express parses repeats as an array) — all three are
// used by different admin-frontend pages against this one endpoint.
const listQuerySchema = z.object({
  type: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim())))
    .pipe(z.array(ledgerType).optional()),
  playerId: z.string().optional(),
  search: z.string().optional(),
  gameId: z.string().optional(),
  roundId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

ledgerRouter.get("/", requirePermission("ledger.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listGlobalLedger(parsed.data))
})

ledgerRouter.get("/export", requirePermission("ledger.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { ...parsed.data, cursor: undefined, limit: undefined }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "ledger",
    filename: `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Entry ID", "Date", "Type", "Player", "Player ID", "Amount", "Balance After", "Game", "Round", "Transaction ID", "Admin-Initiated"],
    countRows: () => countGlobalLedger(filters),
    fetchPage: (cursor, limit) => listGlobalLedger({ ...filters, cursor, limit }),
    toRow: (item) => [
      item.id,
      item.createdAt,
      item.type,
      item.player.username,
      item.player.id,
      item.amount,
      item.balanceAfter,
      item.gameId,
      item.roundId,
      item.transactionId,
      item.actorAdminId ? "Yes" : "No",
    ],
    filtersForAudit: filters,
  })
})
