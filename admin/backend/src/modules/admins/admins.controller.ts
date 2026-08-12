import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { createAdmin, getAdmin, listAdmins, resetAdminMfa, setAdminStatus, updateAdminRole } from "./admins.service"

export const adminsRouter = Router()
adminsRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

adminsRouter.get("/", requirePermission("admins.view"), async (_req, res) => {
  res.json(await listAdmins())
})

adminsRouter.get("/:id", requirePermission("admins.view"), async (req, res) => {
  try {
    res.json(await getAdmin(param(req, "id")))
  } catch (err) {
    sendError(res, err)
  }
})

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(72),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  roleId: z.string().min(1),
})

adminsRouter.post("/", requirePermission("admins.manage"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.status(201).json(await createAdmin(req, req.adminAuth!.id, parsed.data))
  } catch (err) {
    sendError(res, err)
  }
})

const roleSchema = z.object({ roleId: z.string().min(1) })

adminsRouter.patch("/:id/role", requirePermission("admins.manage"), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await updateAdminRole(req, req.adminAuth!.id, param(req, "id"), parsed.data.roleId))
  } catch (err) {
    sendError(res, err)
  }
})

adminsRouter.post("/:id/disable", requirePermission("admins.manage"), async (req, res) => {
  try {
    res.json(await setAdminStatus(req, req.adminAuth!.id, param(req, "id"), "DISABLED"))
  } catch (err) {
    sendError(res, err)
  }
})

adminsRouter.post("/:id/enable", requirePermission("admins.manage"), async (req, res) => {
  try {
    res.json(await setAdminStatus(req, req.adminAuth!.id, param(req, "id"), "ACTIVE"))
  } catch (err) {
    sendError(res, err)
  }
})

adminsRouter.post("/:id/reset-mfa", requirePermission("admins.manage"), async (req, res) => {
  try {
    await resetAdminMfa(req, req.adminAuth!.id, param(req, "id"))
    res.status(204).send()
  } catch (err) {
    sendError(res, err)
  }
})
