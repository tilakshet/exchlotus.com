import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { createTicket, getMyTicket, listMyTickets, replyToMyTicket } from "./support.service"

export const supportRouter = Router()
supportRouter.use(requireAuth)

supportRouter.get("/", async (req, res) => {
  res.json(await listMyTickets(req.auth!.sub))
})

const createTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(1).max(4000),
})

supportRouter.post("/", async (req, res) => {
  const parsed = createTicketSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const ticket = await createTicket(req.auth!.sub, parsed.data.subject, parsed.data.message)
  res.status(201).json({ id: ticket.id })
})

supportRouter.get("/:id", async (req, res) => {
  const ticket = await getMyTicket(req.auth!.sub, req.params.id)
  if (!ticket) return res.status(404).json({ error: "NOT_FOUND" })
  res.json(ticket)
})

const replySchema = z.object({ message: z.string().min(1).max(4000) })

supportRouter.post("/:id/messages", async (req, res) => {
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const message = await replyToMyTicket(req.auth!.sub, req.params.id, parsed.data.message)
  if (!message) return res.status(404).json({ error: "NOT_FOUND" })
  res.status(201).json({ id: message.id })
})
