import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { GamingApiError } from "../../lib/api-error"
import { applyManualDeposit, getWalletDetails, listTransactionHistory, requestWithdrawal, WalletError } from "./wallet.service"

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

// Dev/test convenience only — hard disabled in production by
// wallet.service.ts applyManualDeposit itself. Real deposits go through
// POST /api/payments/deposit (payments.controller.ts) instead.
walletRouter.post("/deposit", async (req, res) => {
  const parsed = adjustmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const result = await applyManualDeposit(req.auth!.externalId, parsed.data.amount)
    res.json(result)
  } catch (err) {
    if (err instanceof GamingApiError && err.code === "INVALID_TRANSACTION") {
      return res.status(403).json({ error: "DISABLED_IN_PRODUCTION", message: err.message })
    }
    throw err
  }
})

const withdrawSchema = z.object({
  amount: z.number().positive(),
  bankAccountId: z.string().min(1),
})

// Reserves the amount (balance -> lockedBalance) and creates a PENDING
// WithdrawalRequest — no money moves yet. An admin approving it in
// admin/backend is what actually calls the payout API. See
// wallet.service.ts requestWithdrawal for the full reasoning.
walletRouter.post("/withdraw", async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const result = await requestWithdrawal(req.auth!.externalId, parsed.data.bankAccountId, parsed.data.amount)
    res.status(201).json({ status: "PENDING", ...result })
  } catch (err) {
    if (err instanceof GamingApiError && err.code === "NO_BALANCE") {
      return res.status(422).json({ error: "INSUFFICIENT_BALANCE" })
    }
    if (err instanceof WalletError && err.code === "BANK_ACCOUNT_NOT_FOUND") {
      return res.status(404).json({ error: err.code, message: err.message })
    }
    throw err
  }
})
