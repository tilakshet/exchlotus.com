import fs from "node:fs"
import path from "node:path"
import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { countKycSubmissions, getKycSubmission, listKycSubmissions, reviewKycSubmission } from "./kyc.service"
import { runCsvExport } from "../../lib/export"

// Same relative path the player backend writes to (backend/src/lib/uploads.ts
// KYC_UPLOAD_DIR) — reachable here because both containers mount the same
// exchlotus_uploads volume at /app/uploads (see docker-compose.prod.yml).
// This process only ever reads from it, never writes.
const KYC_UPLOAD_DIR = path.join(process.cwd(), "uploads", "kyc")

export const kycRouter = Router()
kycRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "NOT_SUBMITTED"] as const

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

kycRouter.get("/", requirePermission("kyc.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listKycSubmissions(parsed.data))
})

kycRouter.get("/export", requirePermission("kyc.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { status: parsed.data.status, search: parsed.data.search }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "kyc",
    filename: `kyc-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Submission ID", "Player", "Phone", "PAN", "Status", "Rejection Reason", "Submitted", "Reviewed"],
    countRows: () => countKycSubmissions(filters),
    fetchPage: (cursor, limit) => listKycSubmissions({ ...filters, cursor, limit }),
    toRow: (item) => [item.id, item.player.username, item.player.phone ?? "", item.panNumber, item.status, item.rejectionReason ?? "", item.submittedAt, item.reviewedAt ?? ""],
    filtersForAudit: filters,
  })
})

kycRouter.get("/:id", requirePermission("kyc.view"), async (req, res) => {
  try {
    const submission = await getKycSubmission(param(req, "id"))
    res.json({
      id: submission.id,
      player: {
        id: submission.player.id,
        username: submission.player.username,
        phone: submission.player.phone,
        externalId: submission.player.externalId,
        status: submission.player.status,
        phoneVerified: submission.player.phoneVerified,
      },
      panNumber: submission.panNumber,
      status: submission.status,
      rejectionReason: submission.rejectionReason,
      submittedAt: submission.createdAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    })
  } catch (err) {
    sendError(res, err)
  }
})

// Streams the actual image bytes — never a public URL. The filename on disk
// is a random UUID (see backend's uploads.ts), and this route is the only
// thing that ever maps a submission id to it, gated by kyc.view.
kycRouter.get("/:id/document/:type", requirePermission("kyc.view"), async (req, res) => {
  const type = req.params.type
  if (type !== "pan" && type !== "photo") {
    return res.status(400).json({ error: "INVALID_DOCUMENT_TYPE" })
  }

  try {
    const submission = await getKycSubmission(param(req, "id"))
    const filename = type === "pan" ? submission.panCardFile : submission.photoFile
    const filePath = path.join(KYC_UPLOAD_DIR, filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "DOCUMENT_NOT_FOUND" })
    }

    res.sendFile(filePath)
  } catch (err) {
    sendError(res, err)
  }
})

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
})

kycRouter.patch("/:id/review", requirePermission("kyc.manage"), async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    const result = await reviewKycSubmission(req, req.adminAuth!.id, param(req, "id"), parsed.data.decision, parsed.data.reason)
    res.json(result)
  } catch (err) {
    sendError(res, err)
  }
})
