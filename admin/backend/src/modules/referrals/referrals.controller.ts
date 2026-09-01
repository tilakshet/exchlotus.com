import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { param } from "../../lib/params"
import { runCsvExport } from "../../lib/export"
import {
  approveReferral,
  countReferrals,
  getReferralDashboardSummary,
  getReferralDetail,
  listReferrals,
  rejectReferral,
  reverseReward,
  reviewRisk,
} from "./referrals.service"
import { getReferralSettings, updateReferralSettings } from "./referral-settings.service"
import { createCampaign, deleteCampaign, getCampaign, listCampaigns, updateCampaign } from "./referral-campaigns.service"

export const referralsRouter = Router()
referralsRouter.use(requireAdminAuth)

function sendError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  throw err
}

const REFERRAL_STATUSES = ["PENDING", "REGISTERED", "QUALIFIED", "REWARDED", "REJECTED", "CANCELLED"] as const
const RISK_STATUSES = ["NORMAL", "REVIEW", "BLOCKED"] as const

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(REFERRAL_STATUSES).optional(),
  riskStatus: z.enum(RISK_STATUSES).optional(),
  campaignId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

referralsRouter.get("/", requirePermission("referrals.view"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await listReferrals(parsed.data))
})

referralsRouter.get("/dashboard", requirePermission("referrals.view"), async (_req, res) => {
  res.json(await getReferralDashboardSummary())
})

referralsRouter.get("/export", requirePermission("referrals.export"), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const filters = { ...parsed.data, cursor: undefined, limit: undefined }

  await runCsvExport(req, res, {
    actorAdminId: req.adminAuth!.id,
    module: "referrals",
    filename: `referrals-export-${new Date().toISOString().slice(0, 10)}.csv`,
    header: ["Referral ID", "Referrer", "Referred User", "Campaign", "Registered", "Qualified", "Rewarded", "Cash Reward", "Coin Reward", "Status", "Risk Status"],
    countRows: () => countReferrals(filters),
    fetchPage: (cursor, limit) => listReferrals({ ...filters, cursor, limit }),
    toRow: (item) => [
      item.id,
      item.referrer.username,
      item.referred.username,
      item.campaign?.name ?? "",
      item.registeredAt,
      item.qualifiedAt ?? "",
      item.rewardedAt ?? "",
      item.cashReward,
      item.coinReward,
      item.status,
      item.riskStatus,
    ],
    filtersForAudit: filters,
  })
})

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  qualificationRule: z.enum(["REGISTRATION_ONLY", "VERIFICATION", "DEPOSIT", "ACTIVITY", "MULTIPLE"]).optional(),
  minDepositAmount: z.number().min(0).optional(),
  minActivityAmount: z.number().min(0).optional(),
  referrerCashReward: z.number().min(0).optional(),
  referrerCoinReward: z.number().int().min(0).optional(),
  referredCashReward: z.number().min(0).optional(),
  referredCoinReward: z.number().int().min(0).optional(),
  rewardExpiryDays: z.number().int().positive().nullable().optional(),
  maxRewardsPerUser: z.number().int().positive().nullable().optional(),
  maxReferredPerUser: z.number().int().positive().nullable().optional(),
  dailyReferralLimit: z.number().int().positive().nullable().optional(),
  monthlyReferralLimit: z.number().int().positive().nullable().optional(),
  minAccountAgeDays: z.number().int().min(0).optional(),
  kycRequired: z.boolean().optional(),
  rewardCooldownHours: z.number().int().min(0).optional(),
  allowedCountries: z.array(z.string()).optional(),
  termsText: z.string().nullable().optional(),
})

referralsRouter.get("/settings", requirePermission("referrals.view"), async (_req, res) => {
  res.json(await getReferralSettings())
})

referralsRouter.patch("/settings", requirePermission("referral-settings.manage"), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await updateReferralSettings(req, req.adminAuth!.id, parsed.data))
})

const campaignSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).optional(),
  qualificationRule: z.enum(["REGISTRATION_ONLY", "VERIFICATION", "DEPOSIT", "ACTIVITY", "MULTIPLE"]).optional(),
  referrerCashReward: z.number().min(0).optional(),
  referrerCoinReward: z.number().int().min(0).optional(),
  referredCashReward: z.number().min(0).optional(),
  referredCoinReward: z.number().int().min(0).optional(),
  minDepositAmount: z.number().min(0).optional(),
  minActivityAmount: z.number().min(0).optional(),
  maxRewards: z.number().int().positive().nullable().optional(),
  expiryDays: z.number().int().positive().nullable().optional(),
})

referralsRouter.get("/campaigns", requirePermission("referrals.view"), async (_req, res) => {
  res.json(await listCampaigns())
})

referralsRouter.post("/campaigns", requirePermission("referral-campaigns.manage"), async (req, res) => {
  const parsed = campaignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.status(201).json(await createCampaign(req, req.adminAuth!.id, parsed.data))
})

referralsRouter.get("/campaigns/:id", requirePermission("referrals.view"), async (req, res) => {
  try {
    res.json(await getCampaign(param(req, "id")))
  } catch (err) {
    sendError(res, err)
  }
})

referralsRouter.patch("/campaigns/:id", requirePermission("referral-campaigns.manage"), async (req, res) => {
  const parsed = campaignSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await updateCampaign(req, req.adminAuth!.id, param(req, "id"), parsed.data))
  } catch (err) {
    sendError(res, err)
  }
})

referralsRouter.delete("/campaigns/:id", requirePermission("referral-campaigns.manage"), async (req, res) => {
  try {
    await deleteCampaign(req, req.adminAuth!.id, param(req, "id"))
    res.status(204).send()
  } catch (err) {
    sendError(res, err)
  }
})

referralsRouter.get("/:id", requirePermission("referrals.view"), async (req, res) => {
  try {
    res.json(await getReferralDetail(param(req, "id")))
  } catch (err) {
    sendError(res, err)
  }
})

referralsRouter.post("/:id/approve", requirePermission("referrals.manage"), async (req, res) => {
  try {
    res.json(await approveReferral(req, param(req, "id"), req.adminAuth!.id))
  } catch (err) {
    sendError(res, err)
  }
})

const reasonSchema = z.object({ reason: z.string().min(3).max(500) })

referralsRouter.post("/:id/reject", requirePermission("referrals.manage"), async (req, res) => {
  const parsed = reasonSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await rejectReferral(req, param(req, "id"), req.adminAuth!.id, parsed.data.reason))
  } catch (err) {
    sendError(res, err)
  }
})

referralsRouter.post("/:id/reverse", requirePermission("referrals.manage"), async (req, res) => {
  const parsed = reasonSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await reverseReward(req, param(req, "id"), req.adminAuth!.id, parsed.data.reason))
  } catch (err) {
    sendError(res, err)
  }
})

const reviewSchema = z.object({ riskStatus: z.enum(RISK_STATUSES), note: z.string().max(1000).optional() })

referralsRouter.post("/:id/review", requirePermission("referrals.manage"), async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  try {
    res.json(await reviewRisk(req, param(req, "id"), req.adminAuth!.id, parsed.data.riskStatus, parsed.data.note))
  } catch (err) {
    sendError(res, err)
  }
})
