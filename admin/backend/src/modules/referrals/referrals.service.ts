import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import { Prisma, type ReferralRewardTxType, type ReferralRiskStatus, type ReferralStatus } from "../../generated/prisma"

export interface ListReferralsOptions {
  search?: string
  status?: ReferralStatus
  riskStatus?: ReferralRiskStatus
  campaignId?: string
  from?: string
  to?: string
  cursor?: string
  limit?: number
}

function buildReferralsWhere(options: Omit<ListReferralsOptions, "cursor" | "limit">): Prisma.ReferralWhereInput {
  return {
    ...(options.status ? { status: options.status } : {}),
    ...(options.riskStatus ? { riskStatus: options.riskStatus } : {}),
    ...(options.campaignId ? { campaignId: options.campaignId } : {}),
    ...(options.from || options.to
      ? {
          createdAt: {
            ...(options.from ? { gte: new Date(options.from) } : {}),
            ...(options.to ? { lte: new Date(options.to) } : {}),
          },
        }
      : {}),
    ...(options.search
      ? {
          OR: [
            { referralCode: { contains: options.search, mode: "insensitive" } },
            { referrer: { username: { contains: options.search, mode: "insensitive" } } },
            { referrer: { phone: { contains: options.search } } },
            { referred: { username: { contains: options.search, mode: "insensitive" } } },
            { referred: { phone: { contains: options.search } } },
          ],
        }
      : {}),
  }
}

export function countReferrals(options: Omit<ListReferralsOptions, "cursor" | "limit">) {
  return prisma.referral.count({ where: buildReferralsWhere(options) })
}

export async function listReferrals(options: ListReferralsOptions) {
  const limit = Math.min(options.limit ?? 25, 100)
  const where = buildReferralsWhere(options)

  const rows = await prisma.referral.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: {
      referrer: { select: { id: true, username: true, phone: true } },
      referred: { select: { id: true, username: true, phone: true } },
      campaign: { select: { id: true, name: true } },
      rewards: { where: { status: "COMPLETED" }, select: { type: true, amount: true } },
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      referrer: row.referrer,
      referred: row.referred,
      referralCode: row.referralCode,
      campaign: row.campaign,
      status: row.status,
      riskStatus: row.riskStatus,
      riskScore: row.riskScore,
      cashReward: row.rewards.filter((r) => r.type === "REFERRAL_CASH_REWARD").reduce((sum, r) => sum + r.amount.toNumber(), 0),
      coinReward: row.rewards.filter((r) => r.type === "REFERRAL_COIN_REWARD").reduce((sum, r) => sum + r.amount.toNumber(), 0),
      registeredAt: row.registeredAt.toISOString(),
      qualifiedAt: row.qualifiedAt?.toISOString() ?? null,
      rewardedAt: row.rewardedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

export async function getReferralDetail(id: string) {
  const referral = await prisma.referral.findUnique({
    where: { id },
    include: {
      referrer: { select: { id: true, username: true, phone: true, email: true, status: true } },
      referred: { select: { id: true, username: true, phone: true, email: true, status: true, createdAt: true } },
      campaign: true,
      riskFlags: { orderBy: { createdAt: "desc" } },
      rewards: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!referral) throw new AdminApiError("NOT_FOUND", "Referral not found")

  return {
    ...referral,
    rewards: referral.rewards.map((r) => ({ ...r, amount: r.amount.toNumber(), balanceBefore: r.balanceBefore?.toNumber() ?? null, balanceAfter: r.balanceAfter?.toNumber() ?? null })),
    campaign: referral.campaign
      ? {
          ...referral.campaign,
          referrerCashReward: referral.campaign.referrerCashReward.toNumber(),
          referredCashReward: referral.campaign.referredCashReward.toNumber(),
          minDepositAmount: referral.campaign.minDepositAmount.toNumber(),
          minActivityAmount: referral.campaign.minActivityAmount.toNumber(),
        }
      : null,
  }
}

/**
 * The one place admin/backend ever credits a referral reward — same
 * FOR UPDATE + idempotent-reference pattern as backend/'s referral.service
 * creditBonus, necessarily reimplemented here (not imported: separate
 * deployable app, same reasoning withdrawals.service.ts already applies to
 * wallet-touching code). Used by approveReferral's manual-override path.
 */
async function creditBonus(
  playerId: string,
  field: "bonusBalance" | "bonusCoinBalance",
  amount: number,
  reference: string,
  meta: { referralId: string; type: ReferralRewardTxType; description: string; actorAdminId: string }
): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.referralRewardTransaction.findUnique({ where: { reference } })
      if (existing) return false

      if (field === "bonusBalance") {
        const walletRows = await tx.$queryRaw<{ id: string; bonusBalance: string }[]>`
          SELECT id, "bonusBalance" FROM wallets WHERE "playerId" = ${playerId} FOR UPDATE
        `
        const wallet = walletRows[0]
        if (!wallet) throw new AdminApiError("NOT_FOUND", "Wallet not provisioned for this player")
        const before = new Prisma.Decimal(wallet.bonusBalance)
        const after = before.plus(amount)
        await tx.wallet.update({ where: { id: wallet.id }, data: { bonusBalance: after } })
        await tx.referralRewardTransaction.create({
          data: {
            playerId,
            referralId: meta.referralId,
            type: meta.type,
            amount: new Prisma.Decimal(amount),
            currency: "INR",
            balanceBefore: before,
            balanceAfter: after,
            reference,
            description: meta.description,
            actorAdminId: meta.actorAdminId,
          },
        })
      } else {
        const walletRows = await tx.$queryRaw<{ id: string; bonusCoinBalance: number }[]>`
          SELECT id, "bonusCoinBalance" FROM wallets WHERE "playerId" = ${playerId} FOR UPDATE
        `
        const wallet = walletRows[0]
        if (!wallet) throw new AdminApiError("NOT_FOUND", "Wallet not provisioned for this player")
        const before = wallet.bonusCoinBalance
        const after = before + amount
        await tx.wallet.update({ where: { id: wallet.id }, data: { bonusCoinBalance: after } })
        await tx.referralRewardTransaction.create({
          data: {
            playerId,
            referralId: meta.referralId,
            type: meta.type,
            amount: new Prisma.Decimal(amount),
            currency: "COIN",
            balanceBefore: new Prisma.Decimal(before),
            balanceAfter: new Prisma.Decimal(after),
            reference,
            description: meta.description,
            actorAdminId: meta.actorAdminId,
          },
        })
      }
      return true
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false
    throw err
  }
}

/**
 * Manual override: force-qualifies and rewards a referral regardless of
 * the automatic qualification engine (backend/'s referral.service.ts) —
 * e.g. an admin decides a borderline/manually-reviewed case should be
 * rewarded anyway. Reuses the exact same reward-amount resolution
 * (campaign override, else global settings) and the same idempotent
 * per-movement credit, so calling this on an already-auto-rewarded
 * referral is always a safe no-op.
 */
export async function approveReferral(req: Request, id: string, actorAdminId: string) {
  const referral = await prisma.referral.findUnique({ where: { id }, include: { campaign: true } })
  if (!referral) throw new AdminApiError("NOT_FOUND", "Referral not found")
  if (referral.status === "REJECTED" || referral.status === "CANCELLED") {
    throw new AdminApiError("REFERRAL_NOT_ELIGIBLE", `This referral is ${referral.status.toLowerCase()} and cannot be approved`)
  }

  const settings = await prisma.referralSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })
  const referrerCash = (referral.campaign?.referrerCashReward ?? settings.referrerCashReward).toNumber()
  const referrerCoin = referral.campaign?.referrerCoinReward ?? settings.referrerCoinReward
  const referredCash = (referral.campaign?.referredCashReward ?? settings.referredCashReward).toNumber()
  const referredCoin = referral.campaign?.referredCoinReward ?? settings.referredCoinReward

  const results = await Promise.all([
    referrerCash > 0
      ? creditBonus(referral.referrerId, "bonusBalance", referrerCash, `referral:${referral.id}:referrer:cash`, {
          referralId: referral.id,
          type: "REFERRAL_CASH_REWARD",
          description: "Referral cash reward (admin-approved)",
          actorAdminId,
        })
      : false,
    referrerCoin > 0
      ? creditBonus(referral.referrerId, "bonusCoinBalance", referrerCoin, `referral:${referral.id}:referrer:coin`, {
          referralId: referral.id,
          type: "REFERRAL_COIN_REWARD",
          description: "Referral coin reward (admin-approved)",
          actorAdminId,
        })
      : false,
    referredCash > 0
      ? creditBonus(referral.referredId, "bonusBalance", referredCash, `referral:${referral.id}:referred:cash`, {
          referralId: referral.id,
          type: "REFERRAL_CASH_REWARD",
          description: "Welcome bonus (admin-approved)",
          actorAdminId,
        })
      : false,
    referredCoin > 0
      ? creditBonus(referral.referredId, "bonusCoinBalance", referredCoin, `referral:${referral.id}:referred:coin`, {
          referralId: referral.id,
          type: "REFERRAL_COIN_REWARD",
          description: "Welcome bonus (admin-approved)",
          actorAdminId,
        })
      : false,
  ])

  const now = new Date()
  const updated = await prisma.referral.update({
    where: { id },
    data: {
      status: "REWARDED",
      qualifiedAt: referral.qualifiedAt ?? now,
      rewardedAt: referral.rewardedAt ?? now,
      reviewedByAdminId: actorAdminId,
    },
  })

  await writeAuditLog(prisma, req, {
    adminId: actorAdminId,
    action: "referral.approve",
    entityType: "Referral",
    entityId: id,
    before: { status: referral.status },
    after: { status: "REWARDED", credited: results.some(Boolean) },
  })

  return { id: updated.id, status: updated.status }
}

export async function rejectReferral(req: Request, id: string, actorAdminId: string, reason: string) {
  const referral = await prisma.referral.findUnique({ where: { id } })
  if (!referral) throw new AdminApiError("NOT_FOUND", "Referral not found")
  if (referral.status === "REWARDED") {
    throw new AdminApiError("REFERRAL_ALREADY_REWARDED", "This referral has already been rewarded — reverse the reward instead of rejecting")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.referral.update({
      where: { id },
      data: { status: "REJECTED", rejectedAt: new Date(), adminNote: reason, reviewedByAdminId: actorAdminId },
    })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "referral.reject",
      entityType: "Referral",
      entityId: id,
      before: { status: referral.status },
      after: { status: "REJECTED" },
      reason,
    })
    return { id: updated.id, status: updated.status }
  })
}

/**
 * Debits back every COMPLETED reward movement for this referral (spec
 * §20) — the original ReferralRewardTransaction rows are never deleted or
 * mutated beyond their own status flipping to REVERSED; each debit is
 * recorded as its own new REFERRAL_REVERSAL row pointing back at what it
 * reverses, so financial history stays immutable and fully traceable.
 */
export async function reverseReward(req: Request, id: string, actorAdminId: string, reason: string) {
  const referral = await prisma.referral.findUnique({ where: { id } })
  if (!referral) throw new AdminApiError("NOT_FOUND", "Referral not found")
  if (referral.status !== "REWARDED") {
    throw new AdminApiError("REFERRAL_NOT_REWARDED", "This referral has not been rewarded — nothing to reverse")
  }

  const completedRewards = await prisma.referralRewardTransaction.findMany({
    where: { referralId: id, status: "COMPLETED", type: { in: ["REFERRAL_CASH_REWARD", "REFERRAL_COIN_REWARD"] } },
  })
  if (completedRewards.length === 0) {
    throw new AdminApiError("REFERRAL_NOT_REWARDED", "No completed reward movements found to reverse")
  }

  for (const reward of completedRewards) {
    const field = reward.type === "REFERRAL_CASH_REWARD" ? "bonusBalance" : "bonusCoinBalance"
    await prisma.$transaction(async (tx) => {
      const reversalReference = `${reward.reference}:reversal`
      const existing = await tx.referralRewardTransaction.findUnique({ where: { reference: reversalReference } })
      if (existing) return

      if (field === "bonusBalance") {
        const walletRows = await tx.$queryRaw<{ id: string; bonusBalance: string }[]>`
          SELECT id, "bonusBalance" FROM wallets WHERE "playerId" = ${reward.playerId} FOR UPDATE
        `
        const wallet = walletRows[0]
        if (!wallet) return
        const before = new Prisma.Decimal(wallet.bonusBalance)
        const after = before.minus(reward.amount)
        await tx.wallet.update({ where: { id: wallet.id }, data: { bonusBalance: after } })
        await tx.referralRewardTransaction.create({
          data: {
            playerId: reward.playerId,
            referralId: id,
            type: "REFERRAL_REVERSAL",
            amount: reward.amount.negated(),
            currency: reward.currency,
            balanceBefore: before,
            balanceAfter: after,
            reference: reversalReference,
            description: `Reversal of ${reward.reference}`,
            reversalOfId: reward.id,
            actorAdminId,
          },
        })
      } else {
        const walletRows = await tx.$queryRaw<{ id: string; bonusCoinBalance: number }[]>`
          SELECT id, "bonusCoinBalance" FROM wallets WHERE "playerId" = ${reward.playerId} FOR UPDATE
        `
        const wallet = walletRows[0]
        if (!wallet) return
        const before = wallet.bonusCoinBalance
        const after = before - reward.amount.toNumber()
        await tx.wallet.update({ where: { id: wallet.id }, data: { bonusCoinBalance: after } })
        await tx.referralRewardTransaction.create({
          data: {
            playerId: reward.playerId,
            referralId: id,
            type: "REFERRAL_REVERSAL",
            amount: reward.amount.negated(),
            currency: reward.currency,
            balanceBefore: new Prisma.Decimal(before),
            balanceAfter: new Prisma.Decimal(after),
            reference: reversalReference,
            description: `Reversal of ${reward.reference}`,
            reversalOfId: reward.id,
            actorAdminId,
          },
        })
      }
      await tx.referralRewardTransaction.update({ where: { id: reward.id }, data: { status: "REVERSED" } })
    })
  }

  await prisma.referral.update({ where: { id }, data: { adminNote: reason, reviewedByAdminId: actorAdminId } })

  await writeAuditLog(prisma, req, {
    adminId: actorAdminId,
    action: "referral.reverse",
    entityType: "Referral",
    entityId: id,
    before: { status: "REWARDED" },
    after: { reversedCount: completedRewards.length },
    reason,
  })

  return { id, reversedCount: completedRewards.length }
}

export async function reviewRisk(req: Request, id: string, actorAdminId: string, riskStatus: ReferralRiskStatus, note?: string) {
  const referral = await prisma.referral.findUnique({ where: { id } })
  if (!referral) throw new AdminApiError("NOT_FOUND", "Referral not found")

  return prisma.$transaction(async (tx) => {
    const updated = await tx.referral.update({
      where: { id },
      data: { riskStatus, adminNote: note ?? referral.adminNote, reviewedByAdminId: actorAdminId },
    })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "referral.review",
      entityType: "Referral",
      entityId: id,
      before: { riskStatus: referral.riskStatus },
      after: { riskStatus },
      reason: note,
    })
    return { id: updated.id, riskStatus: updated.riskStatus }
  })
}

export interface ReferralDashboardSummary {
  totalReferrals: number
  pending: number
  qualified: number
  rewarded: number
  rejected: number
  totalCashRewarded: number
  totalCoinsIssued: number
  activeReferrers: number
  topReferrers: { id: string; username: string; count: number }[]
  conversionRatePct: number
}

export async function getReferralDashboardSummary(): Promise<ReferralDashboardSummary> {
  const [statusCounts, cashSum, coinSum, topReferrerRows] = await Promise.all([
    prisma.referral.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.referralRewardTransaction.aggregate({ where: { type: "REFERRAL_CASH_REWARD", status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.referralRewardTransaction.aggregate({ where: { type: "REFERRAL_COIN_REWARD", status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.referral.groupBy({ by: ["referrerId"], _count: { _all: true }, orderBy: { _count: { referrerId: "desc" } }, take: 5 }),
  ])

  const byStatus = new Map(statusCounts.map((r) => [r.status, r._count._all]))
  const totalReferrals = statusCounts.reduce((sum, r) => sum + r._count._all, 0)
  const rewarded = byStatus.get("REWARDED") ?? 0

  const referrers = await prisma.player.findMany({
    where: { id: { in: topReferrerRows.map((r) => r.referrerId) } },
    select: { id: true, username: true },
  })
  const usernameById = new Map(referrers.map((r) => [r.id, r.username]))

  return {
    totalReferrals,
    pending: byStatus.get("REGISTERED") ?? 0,
    qualified: byStatus.get("QUALIFIED") ?? 0,
    rewarded,
    rejected: (byStatus.get("REJECTED") ?? 0) + (byStatus.get("CANCELLED") ?? 0),
    totalCashRewarded: cashSum._sum.amount?.toNumber() ?? 0,
    totalCoinsIssued: coinSum._sum.amount?.toNumber() ?? 0,
    activeReferrers: topReferrerRows.length > 0 ? await prisma.referral.groupBy({ by: ["referrerId"] }).then((r) => r.length) : 0,
    topReferrers: topReferrerRows.map((r) => ({ id: r.referrerId, username: usernameById.get(r.referrerId) ?? "—", count: r._count._all })),
    conversionRatePct: totalReferrals === 0 ? 0 : (rewarded / totalReferrals) * 100,
  }
}
