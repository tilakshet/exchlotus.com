import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { getUserDetail, listUsers, setUserStatus } from "./users.service"

export const usersRouter = Router()
usersRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

usersRouter.get("/", requirePermission("users.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listUsers(parsed.data))
})

usersRouter.get("/:id", requirePermission("users.view"), async (req, res) => {
  try {
    res.json(await getUserDetail(param(req, "id")))
  } catch (err) {
    sendError(res, err)
  }
})

const statusChangeSchema = z.object({ reason: z.string().min(3).max(500) })

usersRouter.post("/:id/suspend", requirePermission("users.suspend"), async (req, res) => {
  const parsed = statusChangeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const player = await setUserStatus(req, param(req, "id"), req.adminAuth!.id, "SUSPENDED", parsed.data.reason)
    res.json({ id: player.id, status: player.status })
  } catch (err) {
    sendError(res, err)
  }
})

usersRouter.post("/:id/activate", requirePermission("users.suspend"), async (req, res) => {
  const parsed = statusChangeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const player = await setUserStatus(req, param(req, "id"), req.adminAuth!.id, "ACTIVE", parsed.data.reason)
    res.json({ id: player.id, status: player.status })
  } catch (err) {
    sendError(res, err)
  }
})
