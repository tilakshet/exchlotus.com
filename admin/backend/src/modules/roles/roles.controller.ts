import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { createRole, deleteRole, listPermissions, listRoles, updateRolePermissions } from "./roles.service"

export const rolesRouter = Router()
rolesRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

rolesRouter.get("/", requirePermission("roles.view"), async (_req, res) => {
  res.json(await listRoles())
})

rolesRouter.get("/permissions", requirePermission("roles.view"), async (_req, res) => {
  res.json(await listPermissions())
})

const createSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  permissionCodes: z.array(z.string()).default([]),
})

rolesRouter.post("/", requirePermission("roles.manage"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.status(201).json(await createRole(req, req.adminAuth!.id, parsed.data))
  } catch (err) {
    sendError(res, err)
  }
})

const permissionsSchema = z.object({ permissionCodes: z.array(z.string()) })

rolesRouter.patch("/:id/permissions", requirePermission("roles.manage"), async (req, res) => {
  const parsed = permissionsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(
      await updateRolePermissions(
        req,
        req.adminAuth!.id,
        req.adminAuth!.roleId,
        param(req, "id"),
        parsed.data.permissionCodes
      )
    )
  } catch (err) {
    sendError(res, err)
  }
})

rolesRouter.delete("/:id", requirePermission("roles.manage"), async (req, res) => {
  try {
    await deleteRole(req, req.adminAuth!.id, param(req, "id"))
    res.status(204).send()
  } catch (err) {
    sendError(res, err)
  }
})
