import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { listLoginEvents } from "./login-events.service"

// Gated by users.view (not audit.view) — this is player login/session
// activity, not admin-action accountability, so it shares its audience
// with the Users section (and the per-player detail page, which embeds
// this same list filtered by playerId) rather than the stricter audit
// trail aimed at admin oversight.
export const loginEventsRouter = Router()
loginEventsRouter.use(requireAdminAuth)

const listQuerySchema = z.object({
  playerId: z.string().optional(),
  phone: z.string().optional(),
  search: z.string().optional(),
  result: z.enum(["SUCCESS", "FAILURE"]).optional(),
  method: z.enum(["PASSWORD", "OTP", "REGISTER"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

loginEventsRouter.get("/", requirePermission("users.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listLoginEvents(parsed.data))
})
