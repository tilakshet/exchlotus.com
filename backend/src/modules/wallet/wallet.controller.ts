import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { GamingApiError } from "../../lib/api-error"
import { applyManualAdjustment, getWalletDetails, listTransactionHistory } from "./wallet.service"

export const walletRouter = Router()
walletRouter.use(requireAuth)

walletRouter.get("/", async (req, res) => {
  const wallet = await getWalletDetails(req.auth!.externalId)
  res.json(wallet)
})

const historyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

walletRouter.get("/history", async (req, res) => {
  const parsed = historyQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  const page = await listTransactionHistory(req.auth!.externalId, parsed.data)
  res.json(page)
})

const adjustmentSchema = z.object({
  amount: z.number().positive(),
})

// Instant, unconditional balance adjustment — no payment gateway exists yet.
// See wallet.service.ts `applyManualAdjustment` for the "not real money
// movement" caveat.
walletRouter.post("/deposit", async (req, res) => {
  const parsed = adjustmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  const result = await applyManualAdjustment(req.auth!.externalId, "DEPOSIT", parsed.data.amount)
  res.json(result)
})

walletRouter.post("/withdraw", async (req, res) => {
  const parsed = adjustmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const result = await applyManualAdjustment(req.auth!.externalId, "WITHDRAWAL", parsed.data.amount)
    res.json(result)
  } catch (err) {
    if (err instanceof GamingApiError && err.code === "NO_BALANCE") {
      return res.status(422).json({ error: "INSUFFICIENT_BALANCE" })
    }
    throw err
  }
})
