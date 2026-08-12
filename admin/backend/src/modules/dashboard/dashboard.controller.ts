import { Router } from "express"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { getSummary } from "./dashboard.service"

export const dashboardRouter = Router()
dashboardRouter.use(requireAdminAuth)

dashboardRouter.get("/summary", requirePermission("dashboard.view"), async (_req, res) => {
  res.json(await getSummary())
})
