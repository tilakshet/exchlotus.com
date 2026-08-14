import { Router } from "express"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { getSystemStatus } from "./monitoring.service"

export const monitoringRouter = Router()
monitoringRouter.use(requireAdminAuth)

monitoringRouter.get("/status", requirePermission("monitoring.view"), async (_req, res) => {
  res.json(await getSystemStatus())
})
