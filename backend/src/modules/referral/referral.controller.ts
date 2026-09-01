import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { env } from "../../lib/env"
import { logger } from "../../lib/logger"
import { evaluateQualificationForPlayer, getMyReferralHistory, getMyReferralStats, getMyReferralSummary } from "./referral.service"

export const referralRouter = Router()

/**
 * Internal, server-to-server only — mounted BEFORE requireAuth below (it's
 * not a player-facing route at all) and gated by a static shared secret,
 * same pattern as GAMING_WEBHOOK_SHARED_SECRET/CATALOG_SYNC_SECRET. Called
 * by admin/backend after a KYC approval (a separate process, sharing this
 * one Postgres DB but not this codebase) to re-check referral
 * qualification for the VERIFICATION/MULTIPLE rules — deposit and bet
 * qualification triggers live in-process instead (payments.service.ts,
 * gaming-webhook.service.ts) and don't need this route at all.
 */
const internalEvaluateSchema = z.object({ playerId: z.string().min(1) })
referralRouter.post("/internal/evaluate", async (req, res) => {
  const auth = req.header("authorization")
  if (auth !== `Bearer ${env.REFERRAL_INTERNAL_SECRET}`) {
    return res.status(401).json({ error: "UNAUTHENTICATED" })
  }
  const parsed = internalEvaluateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })

  try {
    await evaluateQualificationForPlayer(parsed.data.playerId)
    res.status(204).send()
  } catch (err) {
    logger.error({ err, playerId: parsed.data.playerId }, "Referral qualification re-evaluation failed")
    res.status(500).json({ error: "INTERNAL_ERROR" })
  }
})

referralRouter.use(requireAuth)

referralRouter.get("/", async (req, res) => {
  res.json(await getMyReferralSummary(req.auth!.sub))
})

referralRouter.get("/code", async (req, res) => {
  const summary = await getMyReferralSummary(req.auth!.sub)
  res.json({ code: summary.code, link: summary.link })
})

referralRouter.get("/stats", async (req, res) => {
  res.json(await getMyReferralStats(req.auth!.sub))
})

const historyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
referralRouter.get("/history", async (req, res) => {
  const parsed = historyQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getMyReferralHistory(req.auth!.sub, parsed.data))
})

referralRouter.get("/campaign", async (req, res) => {
  const summary = await getMyReferralSummary(req.auth!.sub)
  res.json(summary.campaign)
})

/**
 * No server-side action beyond acknowledging — there's no analytics/share-
 * tracking infra in this codebase to record against, and the actual
 * share/copy UX (Web Share API with a clipboard fallback) is entirely
 * client-side. Kept as a real endpoint anyway (matching the spec's
 * suggested API surface) rather than skipped, so the frontend has a stable
 * place to call if that tracking is added later without an API shape change.
 */
referralRouter.post("/share", async (req, res) => {
  const summary = await getMyReferralSummary(req.auth!.sub)
  res.json({ link: summary.link })
})
