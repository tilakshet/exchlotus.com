import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { getOpenTicketCount, getTicketDetail, listTickets, replyToTicket, setTicketStatus } from "./support.service"

export const supportRouter = Router()
supportRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

supportRouter.get("/", requirePermission("support.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listTickets(parsed.data))
})

supportRouter.get("/open-count", requirePermission("support.view"), async (_req, res) => {
  res.json({ count: await getOpenTicketCount() })
})

supportRouter.get("/:id", requirePermission("support.view"), async (req, res) => {
  try {
    res.json(await getTicketDetail(param(req, "id")))
  } catch (err) {
    sendError(res, err)
  }
})

const replySchema = z.object({ message: z.string().min(1).max(4000) })

supportRouter.post("/:id/reply", requirePermission("support.manage"), async (req, res) => {
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await replyToTicket(req, req.adminAuth!.id, param(req, "id"), parsed.data.message))
  } catch (err) {
    sendError(res, err)
  }
})

const statusSchema = z.object({ status: z.enum(STATUSES) })

supportRouter.patch("/:id/status", requirePermission("support.manage"), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const ticket = await setTicketStatus(req, req.adminAuth!.id, param(req, "id"), parsed.data.status)
    res.json({ id: ticket.id, status: ticket.status })
  } catch (err) {
    sendError(res, err)
  }
})
