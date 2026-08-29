import { Router, json } from "express"
import { timingSafeEqual } from "node:crypto"
import { env } from "../../lib/env"
import { logger } from "../../lib/logger"
import { GamingApiError } from "../../lib/api-error"
import { gamingWebhookRequestSchema } from "./gaming-webhook.validators"
import { handleGamingWebhook } from "./gaming-webhook.service"

/**
 * Auth: a plain `Authorization: Bearer <token>` header, checked against
 * GAMING_WEBHOOK_SHARED_SECRET — confirmed 2026-08-19 via the gaming
 * provider's own support team as their real, fixed integration pattern.
 * This replaces an earlier self-invented `X-Webhook-Signature`
 * HMAC-over-raw-body scheme, written before we had real docs (the pasted
 * spec never documented an auth mechanism — see README "Open questions").
 * The provider never sent that header, so every real-money `user_balance`
 * check was silently rejected with 401 from Aug 15 onward — the root cause
 * behind a string of confusing downstream game-launch failures.
 */
function isValidBearerToken(header: string | undefined): boolean {
  if (!header?.startsWith("Bearer ")) return false
  const provided = Buffer.from(header.slice("Bearer ".length))
  const expected = Buffer.from(env.GAMING_WEBHOOK_SHARED_SECRET)
  if (provided.length !== expected.length) return false
  return timingSafeEqual(provided, expected)
}

export const gamingWebhookRouter = Router()
// Own body parser — mounted ahead of the app-wide express.json() in app.ts,
// and ahead of apiLimiter (see app.ts): this is inbound provider traffic,
// not user-facing, and a per-IP rate cap would throttle legitimate
// settlement callbacks. No longer needs the raw body specifically (that was
// only for the old HMAC scheme), but stays mounted early for the rate-limit
// reason above.
gamingWebhookRouter.use(json())

/**
 * The provider's own webhook integration test (their dashboard's "Test
 * Webhook" button, which gates real-money launches account-wide) flags ANY
 * user_balance response missing a numeric `balance` field as an integration
 * failure — including a structurally correct error response like
 * {status:false, error:"INVALID_USER"}. Confirmed via that test directly:
 * it wants {status:0, error:"INVALID_USER", balance:0} instead — status as
 * numeric 0, matching their spec's `status: 1` on a successful user_balance
 * response, and balance present (0) even when there's no real balance to
 * report. This only applies to user_balance; every other method's error
 * shape (account_details, transaction_bet/win, refund) is untouched.
 */
function errorBody(error: string, method: string | undefined): Record<string, unknown> {
  if (method === "user_balance") {
    return { status: 0, error, balance: 0 }
  }
  return { status: false, error }
}

// Mounted at the full "/api/gaming_webhook" path in app.ts (not a bare "/api"
// prefix with this as the sub-path) — see app.ts's comment on why that mount
// needs to be exact, not just prefix-broad.
gamingWebhookRouter.post("/", async (req, res) => {
  if (!isValidBearerToken(req.header("authorization"))) {
    // Never log the token itself — but knowing whether the provider sent no
    // header at all vs. a wrong-length/wrong-value one is the difference
    // between "they're not sending auth" and "the two sides have different
    // secrets configured", which isn't distinguishable from the generic
    // rejection message alone.
    const header = req.header("authorization")
    const receivedLength = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).length : null
    logger.warn(
      { hasAuthHeader: !!header, receivedLength, expectedLength: env.GAMING_WEBHOOK_SHARED_SECRET.length },
      "Rejected gaming webhook call with missing/invalid bearer token"
    )
    return res.status(401).json(errorBody("UNAUTHORIZED", typeof req.body?.method === "string" ? req.body.method : undefined))
  }

  const parsed = gamingWebhookRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Rejected malformed gaming webhook payload")
    return res.status(200).json(errorBody("INVALID_TRANSACTION", typeof req.body?.method === "string" ? req.body.method : undefined))
  }

  try {
    const result = await handleGamingWebhook(parsed.data)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof GamingApiError) {
      // user_id included deliberately — pino-http's default req serializer
      // never logs the body, so without this an INVALID_USER spike (as
      // opposed to a genuine one-off) is undiagnosable: there'd be no way
      // to tell whether it's the same stale/test user_id being retried in a
      // loop, or many distinct real players, from these logs alone.
      logger.info({ code: err.code, method: parsed.data.method, userId: parsed.data.user_id }, "Gaming webhook business error")
      return res.status(200).json(errorBody(err.code, parsed.data.method))
    }
    logger.error({ err, method: parsed.data.method }, "Unhandled error processing gaming webhook")
    return res.status(500).json(errorBody("INTERNAL_ERROR", parsed.data.method))
  }
})
