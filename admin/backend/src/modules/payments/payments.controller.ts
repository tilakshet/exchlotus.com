import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { runCsvExport } from "../../lib/export"
import { countPaymentOrders, listPaymentOrders } from "./payments.service"

export const paymentsRouter = Router()
paymentsRouter.use(requireAdminAuth)

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "EXPIRED"]).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

paymentsRouter.get("/", requirePermission("payments.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listPaymentOrders(parsed.data))
})

paymentsRouter.get("/export", requirePermission("payments.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { ...parsed.data, cursor: undefined, limit: undefined }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "payments",
    filename: `payments-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Order ID", "Player", "Amount", "Currency", "Status", "Gateway Trx ID", "Created", "Updated"],
    countRows: () => countPaymentOrders(filters),
    fetchPage: (cursor, limit) => listPaymentOrders({ ...filters, cursor, limit }),
    toRow: (item) => [item.id, item.player.username, item.amount, item.currency, item.status, item.gatewayTrxId ?? "", item.createdAt, item.updatedAt],
    filtersForAudit: filters,
  })
})
