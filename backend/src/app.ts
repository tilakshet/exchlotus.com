import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { apiLimiter } from "./lib/rate-limit"
import { gamingWebhookRouter } from "./modules/webhook/gaming-webhook.controller"
import { catalogRouter } from "./modules/catalog/catalog.controller"
import { gameSessionRouter } from "./modules/game-session/game-session.controller"
import { authRouter } from "./modules/auth/auth.controller"
import { walletRouter } from "./modules/wallet/wallet.controller"
import { profileRouter } from "./modules/profile/profile.controller"
import { homeRouter } from "./modules/home/home.controller"
import { paymentsCallbackRouter } from "./modules/payments/payments-callback.controller"
import { paymentsRouter } from "./modules/payments/payments.controller"
import { bankAccountsRouter } from "./modules/bank-accounts/bank-accounts.controller"
import { supportRouter } from "./modules/support/support.controller"
import { SUPPORT_UPLOAD_DIR } from "./lib/uploads"

export function createApp() {
  const app = express()

  // Production topology is exactly one hop: the nginx container terminates
  // TLS and proxies to this app (see frontend/nginx.conf.template,
  // docker-compose.prod.yml). Trusting 1 hop makes req.ip resolve to the
  // real client IP from X-Forwarded-For — without this, every request
  // behind nginx looks like it comes from the same IP (the proxy's), which
  // both breaks per-client rate limiting (apiLimiter/authLimiter) and any
  // future IP-based audit/anomaly logging. Using a hop count (not `true`)
  // matters: `true` trusts every hop, letting a client forge its own
  // X-Forwarded-For to spoof a fresh IP and bypass rate limiting entirely.
  app.set("trust proxy", 1)

  app.use(pinoHttp({ logger }))
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true, credentials: true }))

  app.get("/health", (_req, res) => res.json({ status: "ok" }))

  // Mounted before apiLimiter — this is inbound provider traffic (bearer-
  // token verified, see gaming-webhook.controller.ts), not user-facing, and
  // a 300/15min-per-IP cap would throttle legitimate settlement callbacks.
  app.use("/api", gamingWebhookRouter)
  app.use("/api/payments", paymentsCallbackRouter)
  app.use("/api", apiLimiter)

  app.use(express.json())
  app.use("/api/auth", authRouter)
  app.use("/api/wallet", walletRouter)
  app.use("/api/profile", profileRouter)
  app.use("/api/catalog", catalogRouter)
  app.use("/api/game-session", gameSessionRouter)
  app.use("/api/home", homeRouter)
  app.use("/api/payments", paymentsRouter)
  app.use("/api/bank-accounts", bankAccountsRouter)
  app.use("/api/support", supportRouter)

  // Uploaded support-ticket images (see lib/uploads.ts). helmet's default
  // Cross-Origin-Resource-Policy: same-origin would otherwise block
  // admin/frontend — a different domain — from loading these as <img>
  // src; overridden to cross-origin on this route only, nowhere else.
  app.use(
    "/api/uploads/support",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
      next()
    },
    express.static(SUPPORT_UPLOAD_DIR)
  )

  app.use((req, res) => {
    res.status(404).json({ error: "NOT_FOUND", path: req.path })
  })

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "Unhandled error")
    res.status(500).json({ error: "INTERNAL_ERROR" })
  })

  return app
}
