import { Router, type Request } from "express"
import { timingSafeEqual, createHmac } from "node:crypto"
import { env } from "../../lib/env"
import { logger } from "../../lib/logger"
import { GamingApiError } from "../../lib/api-error"
import { gamingWebhookRequestSchema } from "./gaming-webhook.validators"
import { handleGamingWebhook } from "./gaming-webhook.service"

interface RequestWithRawBody extends Request {
  rawBody?: Buffer
}

/**
 * The spec (as provided) doesn't document a webhook signature/auth scheme —
 * no header name, no algorithm. CLAUDE.md requires webhook signature
 * verification regardless, so this implements a standard HMAC-SHA256-over-
 * raw-body convention (`X-Webhook-Signature: <hex>`) as a placeholder.
 * Replace with whatever the real provider actually documents before this
 * goes anywhere near production — see README "Open questions".
 */
function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false
  const expected = createHmac("sha256", env.GAMING_WEBHOOK_SHARED_SECRET).update(rawBody).digest("hex")
  const expectedBuf = Buffer.from(expected, "hex")
  const providedBuf = Buffer.from(signatureHeader, "hex")
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

export const gamingWebhookRouter = Router()

gamingWebhookRouter.post(
  "/gaming_webhook",
  (req, _res, next) => {
    // Capture the raw bytes for signature verification before JSON parsing
    // discards them — express.json() doesn't retain the original buffer.
    const chunks: Buffer[] = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => {
      ;(req as RequestWithRawBody).rawBody = Buffer.concat(chunks)
      try {
        req.body = JSON.parse((req as RequestWithRawBody).rawBody!.toString("utf8") || "{}")
      } catch {
        req.body = {}
      }
      next()
    })
  },
  async (req, res) => {
    const rawBody = (req as RequestWithRawBody).rawBody ?? Buffer.alloc(0)
    if (!isValidSignature(rawBody, req.header("x-webhook-signature"))) {
      logger.warn("Rejected gaming webhook call with missing/invalid signature")
      return res.status(401).json({ status: false, error: "UNAUTHORIZED" })
    }

    const parsed = gamingWebhookRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, "Rejected malformed gaming webhook payload")
      return res.status(200).json({ status: false, error: "INVALID_TRANSACTION" })
    }

    try {
      const result = await handleGamingWebhook(parsed.data)
      return res.status(200).json(result)
    } catch (err) {
      if (err instanceof GamingApiError) {
        logger.info({ code: err.code, method: parsed.data.method }, "Gaming webhook business error")
        return res.status(200).json({ status: false, error: err.code })
      }
      logger.error({ err, method: parsed.data.method }, "Unhandled error processing gaming webhook")
      return res.status(500).json({ status: false, error: "INTERNAL_ERROR" })
    }
  }
)
