import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { parseSupportImageUpload, supportImageUrl } from "../../lib/uploads"
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

// multipart/form-data (fields: subject, message, optional image file) —
// express.json() only parses application/json bodies (see app.ts), so it
// leaves req.body untouched here; multer populates both req.body's text
// fields and req.file from the multipart stream itself.
supportRouter.post("/", async (req, res) => {
  const upload = await parseSupportImageUpload(req, res)
  if (upload.error) return res.status(422).json({ error: "VALIDATION_ERROR", message: upload.error })

  const parsed = createTicketSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })

  const attachmentUrl = upload.filename ? supportImageUrl(upload.filename) : undefined
  const ticket = await createTicket(req.auth!.sub, parsed.data.subject, parsed.data.message, attachmentUrl)
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
