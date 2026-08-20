import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { adminApiLimiter } from "./lib/rate-limit"
import { requestContext } from "./lib/request-context"
import { adminAuthRouter } from "./modules/auth/admin-auth.controller"
import { dashboardRouter } from "./modules/dashboard/dashboard.controller"
import { usersRouter } from "./modules/users/users.controller"
import { walletsRouter } from "./modules/wallets/wallets.controller"
import { withdrawalsRouter } from "./modules/withdrawals/withdrawals.controller"
import { adminsRouter } from "./modules/admins/admins.controller"
import { rolesRouter } from "./modules/roles/roles.controller"
import { auditRouter } from "./modules/audit/audit.controller"
import { ledgerRouter } from "./modules/ledger/ledger.controller"
import { monitoringRouter } from "./modules/monitoring/monitoring.controller"
import { reportsRouter } from "./modules/reports/reports.controller"
import { gamesRouter } from "./modules/games/games.controller"
import { notificationsRouter } from "./modules/notifications/notifications.controller"
import { supportRouter } from "./modules/support/support.controller"
import { loginEventsRouter } from "./modules/login-events/login-events.controller"

export function createApp() {
  const app = express()

  // Same topology assumption as backend/ — exactly one hop, the admin
  // frontend's nginx container (see admin/frontend/nginx.conf.template).
  app.set("trust proxy", 1)

  app.use(pinoHttp({ logger }))
  app.use(requestContext)
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true, credentials: true }))

  app.get("/health", (_req, res) => res.json({ status: "ok" }))

  app.use("/admin-api", adminApiLimiter)
  app.use(express.json())

  app.use("/admin-api/auth", adminAuthRouter)
  app.use("/admin-api/dashboard", dashboardRouter)
  app.use("/admin-api/users", usersRouter)
  app.use("/admin-api/wallets", walletsRouter)
  app.use("/admin-api/withdrawals", withdrawalsRouter)
  app.use("/admin-api/admins", adminsRouter)
  app.use("/admin-api/roles", rolesRouter)
  app.use("/admin-api/audit", auditRouter)
  app.use("/admin-api/ledger", ledgerRouter)
  app.use("/admin-api/monitoring", monitoringRouter)
  app.use("/admin-api/reports", reportsRouter)
  app.use("/admin-api/games", gamesRouter)
  app.use("/admin-api/notifications", notificationsRouter)
  app.use("/admin-api/support", supportRouter)
  app.use("/admin-api/login-events", loginEventsRouter)

  app.use((req, res) => {
    res.status(404).json({ error: "NOT_FOUND", path: req.path })
  })

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "Unhandled error")
    res.status(500).json({ error: "INTERNAL_ERROR" })
  })

  return app
}
