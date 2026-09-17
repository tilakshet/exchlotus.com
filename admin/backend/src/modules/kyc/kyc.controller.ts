import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { countKycSubmissions, getKycSubmission, listKycSubmissions } from "./kyc.service"
import { runCsvExport } from "../../lib/export"

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
      panType: submission.panType,
      fullName: submission.fullName,
      firstName: submission.firstName,
      middleName: submission.middleName,
      lastName: submission.lastName,
      gender: submission.gender,
      aadhaarNumber: submission.aadhaarNumber,
      aadhaarLinked: submission.aadhaarLinked,
      dateOfBirth: submission.dateOfBirth,
      buildingName: submission.buildingName,
      locality: submission.locality,
      streetName: submission.streetName,
      pincode: submission.pincode,
      city: submission.city,
      state: submission.state,
      country: submission.country,
      mobile: submission.mobile,
      email: submission.email,
      verificationSource: submission.verificationSource,
      provider: submission.provider,
      providerRequestId: submission.providerRequestId,
      status: submission.status,
      rejectionReason: submission.rejectionReason,
      submittedAt: submission.createdAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      verifiedAt: submission.verifiedAt,
    })
  } catch (err) {
    sendError(res, err)
  }
})

