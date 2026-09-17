import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { adjustBonusCoins, getBonusWallet, listBonusTransactions } from "./bonus.service"

export const bonusRouter = Router()
bonusRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

bonusRouter.get("/:playerId", requirePermission("bonus.view"), async (req, res) => {
  try {
    res.json(await getBonusWallet(param(req, "playerId")))
  } catch (err) {
    sendError(res, err)
  }
})

const transactionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
bonusRouter.get("/:playerId/transactions", requirePermission("bonus.view"), async (req, res) => {
  const parsed = transactionsQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listBonusTransactions(param(req, "playerId"), parsed.data))
})

const adjustSchema = z.object({
  coins: z.number().int().refine((v) => v !== 0, "coins must not be zero"),
  reason: z.string().min(3).max(500),
  idempotencyKey: z.string().min(8).max(200),
})
bonusRouter.post("/:playerId/adjust", requirePermission("bonus.adjust"), async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const result = await adjustBonusCoins(
      req,
      param(req, "playerId"),
      req.adminAuth!.id,
      parsed.data.coins,
      parsed.data.reason,
      parsed.data.idempotencyKey
    )
    res.json(result)
  } catch (err) {
    sendError(res, err)
  }
})
