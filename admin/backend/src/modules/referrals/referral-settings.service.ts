import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import type { ReferralQualificationRule } from "../../generated/prisma"

export interface ReferralSettingsInput {
  enabled?: boolean
  qualificationRule?: ReferralQualificationRule
  minDepositAmount?: number
  minActivityAmount?: number
  referrerCashReward?: number
  referrerCoinReward?: number
  referredCashReward?: number
  referredCoinReward?: number
  rewardExpiryDays?: number | null
  maxRewardsPerUser?: number | null
  maxReferredPerUser?: number | null
  dailyReferralLimit?: number | null
  monthlyReferralLimit?: number | null
  minAccountAgeDays?: number
  kycRequired?: boolean
  rewardCooldownHours?: number
  allowedCountries?: string[]
  termsText?: string | null
}

export async function getReferralSettings() {
  const settings = await prisma.referralSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })
  return {
    ...settings,
    minDepositAmount: settings.minDepositAmount.toNumber(),
    minActivityAmount: settings.minActivityAmount.toNumber(),
    referrerCashReward: settings.referrerCashReward.toNumber(),
    referredCashReward: settings.referredCashReward.toNumber(),
  }
}

export async function updateReferralSettings(req: Request, actorAdminId: string, input: ReferralSettingsInput) {
  const before = await prisma.referralSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })

  const updated = await prisma.referralSettings.update({
    where: { id: "default" },
    data: { ...input, updatedByAdminId: actorAdminId },
  })

  await writeAuditLog(prisma, req, {
    adminId: actorAdminId,
    action: "referral-settings.update",
    entityType: "ReferralSettings",
    entityId: "default",
    before,
    after: updated,
  })

  return {
    ...updated,
    minDepositAmount: updated.minDepositAmount.toNumber(),
    minActivityAmount: updated.minActivityAmount.toNumber(),
    referrerCashReward: updated.referrerCashReward.toNumber(),
    referredCashReward: updated.referredCashReward.toNumber(),
  }
}
