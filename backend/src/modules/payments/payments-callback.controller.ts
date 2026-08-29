import { Router, json, type Request } from "express"
import { createHmac, timingSafeEqual } from "node:crypto"
import { env } from "../../lib/env"
import { logger } from "../../lib/logger"
import { payinCallbackSchema, payoutCallbackSchema, cashfreeWebhookSchema } from "./payments.validators"
import { handlePayinCallback, handlePayoutCallback } from "./payments.service"

/**
 * Inbound gateway traffic, not user-facing — mounted before apiLimiter (same
 * reasoning as gaming-webhook.controller.ts: a per-IP cap would drop
 * legitimate callbacks from the gateway's own infrastructure) and needs its
 * own express.json() since it sits ahead of the app-wide one in app.ts.
 * Always responds 200 regardless of outcome (unknown order, bad signature-
 * equivalent binding, etc.) — see payments.service.ts's header comments for
 * why Oro's callback can't be signature-verified, and returning a
 * differentiated status would just help an attacker probe for valid
 * order/trx ids. Cashfree's route below IS signature-verified, but still
 * replies 200 either way for the same anti-probing reason.
 */
export const paymentsCallbackRouter = Router()
// Mounted ahead of the app-wide express.json() in app.ts, so this router
// needs its own body parser. `verify` stashes the raw bytes on the request —
// needed only by the Cashfree route (its signature is computed over the raw
// body, not the parsed/re-serialized one), harmless for Oro's routes.
interface RequestWithRawBody extends Request {
  rawBody?: Buffer
}
paymentsCallbackRouter.use(
  json({
    verify: (req, _res, buf) => {
      ;(req as RequestWithRawBody).rawBody = buf
    },
  })
)

/**
 * Cashfree signs webhooks: base64(HMAC-SHA256(`${timestamp}${rawBody}`,
 * CASHFREE_CLIENT_SECRET)), compared against `x-webhook-signature`
 * (`x-webhook-timestamp` carries the timestamp). There's no separate
 * webhook-specific secret — Cashfree reuses the same Client Secret used for
 * API auth (confirmed against their own reference implementation,
 * github.com/cashfree/cashfree-pg-webhook). Documented behavior either way,
 * unlike Oro's callback which sends no signature at all.
 */
function isValidCashfreeSignature(rawBody: Buffer | undefined, timestamp: string | undefined, signature: string | undefined): boolean {
  if (!rawBody || !timestamp || !signature) return false
  const expected = createHmac("sha256", env.CASHFREE_CLIENT_SECRET)
    .update(timestamp + rawBody.toString())
    .digest("base64")
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(signature)
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

paymentsCallbackRouter.post("/payin/callback", async (req, res) => {
  const parsed = payinCallbackSchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Malformed PayIn callback")
    return res.status(200).json({ received: true })
  }
  await handlePayinCallback({ order_id: parsed.data.order_id, amount: Number(parsed.data.amount), status: parsed.data.status })
  res.status(200).json({ received: true })
})

/**
 * Cashfree sends more webhook `type`s than just payment outcomes (refunds,
 * disputes, ...) — only these move a PayIn order forward. Others are
 * acknowledged and ignored rather than forwarded to handlePayinCallback,
 * which only understands "success" vs "everything else = FAILED"; a
 * non-payment event, or an in-flight PENDING status Cashfree doesn't
 * actually send a webhook for, must not prematurely fail a live order.
 */
const TERMINAL_CASHFREE_EVENTS: Record<string, "success" | "failed"> = {
  PAYMENT_SUCCESS_WEBHOOK: "success",
  PAYMENT_FAILED_WEBHOOK: "failed",
  PAYMENT_USER_DROPPED_WEBHOOK: "failed",
}

paymentsCallbackRouter.post("/payin/callback/cashfree", async (req, res) => {
  const signature = req.header("x-webhook-signature")
  const timestamp = req.header("x-webhook-timestamp")
  if (!isValidCashfreeSignature((req as RequestWithRawBody).rawBody, timestamp, signature)) {
    logger.warn({ hasSignature: !!signature, hasTimestamp: !!timestamp }, "Rejected Cashfree webhook with invalid/missing signature")
    return res.status(200).json({ received: true })
  }

  const parsed = cashfreeWebhookSchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Malformed Cashfree webhook")
    return res.status(200).json({ received: true })
  }

  const status = TERMINAL_CASHFREE_EVENTS[parsed.data.type]
  if (!status) {
    return res.status(200).json({ received: true })
  }

  await handlePayinCallback({
    order_id: parsed.data.data.order.order_id,
    amount: parsed.data.data.payment.payment_amount,
    status,
  })
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
