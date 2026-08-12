import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { listAuditLogs } from "./audit.service"

export const auditRouter = Router()
auditRouter.use(requireAdminAuth)

const listQuerySchema = z.object({
  adminId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

auditRouter.get("/", requirePermission("audit.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listAuditLogs(parsed.data))
})
