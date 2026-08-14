import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { getUnreadCount, listNotifications, markNotificationsRead } from "./notifications.service"

export const notificationsRouter = Router()
notificationsRouter.use(requireAdminAuth)
notificationsRouter.use(requirePermission("notifications.view"))

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

notificationsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listNotifications(req.adminAuth!.id, parsed.data))
})

notificationsRouter.get("/unread-count", async (req, res) => {
  res.json({ count: await getUnreadCount(req.adminAuth!.id) })
})

notificationsRouter.post("/mark-read", async (req, res) => {
  await markNotificationsRead(req.adminAuth!.id)
  res.status(204).send()
})
