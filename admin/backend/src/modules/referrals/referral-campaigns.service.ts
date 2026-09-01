import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import type { ReferralCampaignStatus, ReferralQualificationRule } from "../../generated/prisma"

function serializeCampaign(campaign: {
  id: string
  name: string
  description: string | null
  startAt: Date
  endAt: Date
  status: ReferralCampaignStatus
  qualificationRule: ReferralQualificationRule
  referrerCashReward: { toNumber(): number }
  referrerCoinReward: number
  referredCashReward: { toNumber(): number }
  referredCoinReward: number
  minDepositAmount: { toNumber(): number }
  minActivityAmount: { toNumber(): number }
  maxRewards: number | null
  expiryDays: number | null
  createdByAdminId: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    startAt: campaign.startAt.toISOString(),
    endAt: campaign.endAt.toISOString(),
    status: campaign.status,
    qualificationRule: campaign.qualificationRule,
    referrerCashReward: campaign.referrerCashReward.toNumber(),
    referrerCoinReward: campaign.referrerCoinReward,
    referredCashReward: campaign.referredCashReward.toNumber(),
    referredCoinReward: campaign.referredCoinReward,
    minDepositAmount: campaign.minDepositAmount.toNumber(),
    minActivityAmount: campaign.minActivityAmount.toNumber(),
    maxRewards: campaign.maxRewards,
    expiryDays: campaign.expiryDays,
    createdByAdminId: campaign.createdByAdminId,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  }
}

export async function listCampaigns() {
  const campaigns = await prisma.referralCampaign.findMany({ orderBy: { createdAt: "desc" } })
  return campaigns.map(serializeCampaign)
}

export async function getCampaign(id: string) {
  const campaign = await prisma.referralCampaign.findUnique({ where: { id } })
  if (!campaign) throw new AdminApiError("CAMPAIGN_NOT_FOUND", "Referral campaign not found")
  return serializeCampaign(campaign)
}

export interface CampaignInput {
  name: string
  description?: string
  startAt: string
  endAt: string
  status?: ReferralCampaignStatus
  qualificationRule?: ReferralQualificationRule
  referrerCashReward?: number
  referrerCoinReward?: number
  referredCashReward?: number
  referredCoinReward?: number
  minDepositAmount?: number
  minActivityAmount?: number
  maxRewards?: number | null
  expiryDays?: number | null
}

export async function createCampaign(req: Request, actorAdminId: string, input: CampaignInput) {
  const campaign = await prisma.referralCampaign.create({
    data: {
      name: input.name,
      description: input.description,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      status: input.status ?? "DRAFT",
      qualificationRule: input.qualificationRule ?? "REGISTRATION_ONLY",
      referrerCashReward: input.referrerCashReward ?? 0,
      referrerCoinReward: input.referrerCoinReward ?? 0,
      referredCashReward: input.referredCashReward ?? 0,
      referredCoinReward: input.referredCoinReward ?? 0,
      minDepositAmount: input.minDepositAmount ?? 0,
      minActivityAmount: input.minActivityAmount ?? 0,
      maxRewards: input.maxRewards ?? null,
      expiryDays: input.expiryDays ?? null,
      createdByAdminId: actorAdminId,
    },
  })

  await writeAuditLog(prisma, req, {
    adminId: actorAdminId,
    action: "referral-campaign.create",
    entityType: "ReferralCampaign",
    entityId: campaign.id,
    after: { name: campaign.name, status: campaign.status },
  })

  return serializeCampaign(campaign)
}

/**
 * Editing a campaign never touches already-attributed Referral rows —
 * they snapshotted this campaign's reward amounts at attribution time
 * (Referral.campaignId is set once, referral.service.ts never re-reads
 * live campaign fields for an already-created referral's reward math), so
 * this is safe to call even while referrals are actively qualifying under it.
 */
export async function updateCampaign(req: Request, actorAdminId: string, id: string, input: Partial<CampaignInput>) {
  const existing = await prisma.referralCampaign.findUnique({ where: { id } })
  if (!existing) throw new AdminApiError("CAMPAIGN_NOT_FOUND", "Referral campaign not found")

  const updated = await prisma.referralCampaign.update({
    where: { id },
    data: {
      ...input,
      ...(input.startAt ? { startAt: new Date(input.startAt) } : {}),
      ...(input.endAt ? { endAt: new Date(input.endAt) } : {}),
    },
  })

  await writeAuditLog(prisma, req, {
    adminId: actorAdminId,
    action: "referral-campaign.update",
    entityType: "ReferralCampaign",
    entityId: id,
    before: { name: existing.name, status: existing.status },
    after: { name: updated.name, status: updated.status },
  })

  return serializeCampaign(updated)
}

export async function deleteCampaign(req: Request, actorAdminId: string, id: string) {
  const existing = await prisma.referralCampaign.findUnique({ where: { id } })
  if (!existing) throw new AdminApiError("CAMPAIGN_NOT_FOUND", "Referral campaign not found")

  // Referral.campaignId uses onDelete: SetNull (see schema.prisma) —
  // historical referrals keep their own snapshot fields regardless, they
  // just lose the campaign name/link once it's deleted. Deleting a
  // campaign with attributed referrals is allowed rather than blocked;
  // ending it (status: ENDED) is the safer alternative for most cases.
  await prisma.referralCampaign.delete({ where: { id } })

  await writeAuditLog(prisma, req, {
    adminId: actorAdminId,
    action: "referral-campaign.delete",
    entityType: "ReferralCampaign",
    entityId: id,
    before: { name: existing.name },
  })
}
