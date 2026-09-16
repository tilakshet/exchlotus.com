import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { BonusError } from "./bonus.errors"
import { convertCoins, getBonusRules, getBonusWallet, listBonusTransactions } from "./bonus.service"

export const bonusRouter = Router()
bonusRouter.use(requireAuth)

// req.auth!.sub is this player's own internal id — every route below acts
// only on the authenticated caller's own bonus wallet, never a client-
// supplied playerId, so there's no IDOR surface here by construction.

bonusRouter.get("/wallet", async (req, res) => {
  res.json(await getBonusWallet(req.auth!.sub))
})

bonusRouter.get("/rules", (_req, res) => {
  res.json(getBonusRules())
})

const historyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
bonusRouter.get("/transactions", async (req, res) => {
  const parsed = historyQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listBonusTransactions(req.auth!.sub, parsed.data))
})

const convertSchema = z.object({
  idempotencyKey: z.string().min(8).max(200),
})
bonusRouter.post("/convert", async (req, res) => {
  const parsed = convertSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })

  try {
    const result = await convertCoins(req.auth!.sub, parsed.data.idempotencyKey)
    res.json(result)
  } catch (err) {
    if (err instanceof BonusError && err.code === "INSUFFICIENT_COINS") {
      return res.status(422).json({ error: err.code, message: err.message })
    }
    throw err
  }
})
