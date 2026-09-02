import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { runCsvExport } from "../../lib/export"
import { approveWithdrawal, countWithdrawals, listWithdrawals, rejectWithdrawal } from "./withdrawals.service"

export const withdrawalsRouter = Router()
withdrawalsRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "PAID", "FAILED"]).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

withdrawalsRouter.get("/", requirePermission("withdrawals.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listWithdrawals(parsed.data))
})

withdrawalsRouter.get("/export", requirePermission("withdrawals.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { ...parsed.data, cursor: undefined, limit: undefined }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "withdrawals",
    filename: `withdrawals-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Withdrawal ID", "Player", "Amount", "Status", "Bank", "Account Number", "UTR", "Requested", "Decided"],
    countRows: () => countWithdrawals(filters),
    fetchPage: (cursor, limit) => listWithdrawals({ ...filters, cursor, limit }),
    toRow: (item) => [
      item.id,
      item.username,
      item.amount,
      item.status,
      item.bankAccount.bankName,
      item.bankAccount.accountNumber,
      item.gatewayUtr ?? "",
      item.requestedAt,
      item.decidedAt ?? "",
    ],
    filtersForAudit: filters,
  })
})

withdrawalsRouter.post("/:id/approve", requirePermission("withdrawals.approve"), async (req, res) => {
  try {
    res.json(await approveWithdrawal(req, param(req, "id"), req.adminAuth!.id))
  } catch (err) {
    sendError(res, err)
  }
})

const rejectSchema = z.object({
  reason: z.string().min(3).max(500),
})

withdrawalsRouter.post("/:id/reject", requirePermission("withdrawals.approve"), async (req, res) => {
  const parsed = rejectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await rejectWithdrawal(req, param(req, "id"), req.adminAuth!.id, parsed.data.reason))
  } catch (err) {
    sendError(res, err)
  }
})
