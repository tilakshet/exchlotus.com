import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { adjustBalance, getWalletDetails, listLedger } from "./wallets.service"

export const walletsRouter = Router()
walletsRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

walletsRouter.get("/:playerId", requirePermission("wallets.view"), async (req, res) => {
  try {
    res.json(await getWalletDetails(param(req, "playerId")))
  } catch (err) {
    sendError(res, err)
  }
})

const ledgerQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

walletsRouter.get("/:playerId/ledger", requirePermission("ledger.view"), async (req, res) => {
  const parsed = ledgerQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listLedger(param(req, "playerId"), parsed.data))
})

const adjustSchema = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"]),
  amount: z.number().positive(),
  reason: z.string().min(3).max(500),
})

walletsRouter.post("/:playerId/adjust", requirePermission("wallets.adjust"), async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const result = await adjustBalance(
      req,
      param(req, "playerId"),
      req.adminAuth!.id,
      parsed.data.type,
      parsed.data.amount,
      parsed.data.reason
    )
    res.json(result)
  } catch (err) {
    sendError(res, err)
  }
})
