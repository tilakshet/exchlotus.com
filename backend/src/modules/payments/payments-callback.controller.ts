import { Router, json } from "express"
import { logger } from "../../lib/logger"
import { payinCallbackSchema, payoutCallbackSchema } from "./payments.validators"
import { handlePayinCallback, handlePayoutCallback } from "./payments.service"

/**
 * Inbound gateway traffic, not user-facing — mounted before apiLimiter (same
 * reasoning as gaming-webhook.controller.ts: a per-IP cap would drop
 * legitimate callbacks from the gateway's own infrastructure) and needs its
 * own express.json() since it sits ahead of the app-wide one in app.ts.
 * Always responds 200 regardless of outcome (unknown order, bad signature-
 * equivalent binding, etc.) — see payments.service.ts's header comments for
 * why nothing here can be signature-verified, and returning a differentiated
 * status would just help an attacker probe for valid order/trx ids.
 */
export const paymentsCallbackRouter = Router()
// Mounted ahead of the app-wide express.json() in app.ts, so this router
// needs its own body parser.
paymentsCallbackRouter.use(json())

paymentsCallbackRouter.post("/payin/callback", async (req, res) => {
  const parsed = payinCallbackSchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Malformed PayIn callback")
    return res.status(200).json({ received: true })
  }
  await handlePayinCallback({ order_id: parsed.data.order_id, amount: Number(parsed.data.amount), status: parsed.data.status })
  res.status(200).json({ received: true })
})

paymentsCallbackRouter.post("/payout/callback", async (req, res) => {
  const parsed = payoutCallbackSchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Malformed Payout callback")
    return res.status(200).json({ received: true })
  }
  await handlePayoutCallback({ cus_trx_id: parsed.data.cus_trx_id, status: parsed.data.status, utr: parsed.data.utr })
  res.status(200).json({ received: true })
})
