import { randomBytes } from "node:crypto"
import { Prisma, type ReferralQualificationRule, type ReferralRewardTxType, type ReferralSettings } from "@prisma/client"
import { prisma } from "../../lib/prisma"
import { env } from "../../lib/env"
import { logger } from "../../lib/logger"
import { publishPlayerNotification } from "../../lib/redis"
import { ReferralError } from "./referral.errors"

// Excludes 0/O/1/I — a code meant to be read aloud/typed by hand, same
// reasoning as most real-world short-code alphabets.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const CODE_LENGTH = 8
const CODE_GENERATION_ATTEMPTS = 5

const RAPID_REGISTRATION_WINDOW_MINUTES = 60
const RAPID_REGISTRATION_THRESHOLD = 5

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return code
}

/**
 * Unpredictable server-generated code (spec §15) — not derived from
 * username/email, so it can't be used to enumerate or impersonate
 * accounts by guessing. Lazily generated on first read/write rather than
 * backfilled for every existing player up front: self-healing, no
 * separate migration/script needed, and an account that never shares its
 * link never needs one.
 */
export async function ensureReferralCode(playerId: string): Promise<string> {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId }, select: { referralCode: true } })
  if (player.referralCode) return player.referralCode

  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt++) {
    const code = generateCode()
    try {
      const updated = await prisma.player.update({ where: { id: playerId }, data: { referralCode: code }, select: { referralCode: true } })
      return updated.referralCode!
    } catch (err) {
      // P2002 = unique constraint violation — extremely unlikely at this
      // alphabet/length, but retried rather than assumed impossible.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue
      throw err
    }
  }
  throw new ReferralError("CODE_GENERATION_FAILED", "Could not generate a unique referral code — please try again")
}

function referralLink(code: string): string {
  // PAYMENT_CALLBACK_BASE_URL is this backend's documented frontend origin
  // (see env.ts) — reused here rather than a new env var, same as the
  // payments module already does, per "domain must come from existing
  // application configuration".
  return `${env.PAYMENT_CALLBACK_BASE_URL}/login?view=register&ref=${encodeURIComponent(code)}`
}

/**
 * Single global settings row, auto-provisioned with safe defaults
 * (enabled: false) on first read — no separate seed step required, and
 * the feature stays off until an admin explicitly turns it on.
 */
export async function getSettings(): Promise<ReferralSettings> {
  return prisma.referralSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })
}

export async function getActiveCampaign() {
  const now = new Date()
  return prisma.referralCampaign.findFirst({
    where: { status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMyReferralSummary(playerId: string) {
  const [code, settings, campaign] = await Promise.all([ensureReferralCode(playerId), getSettings(), getActiveCampaign()])
  return {
    code,
    link: referralLink(code),
    enabled: settings.enabled,
    terms: settings.termsText,
    campaign: campaign
      ? {
          name: campaign.name,
          referrerCashReward: campaign.referrerCashReward.toNumber(),
          referrerCoinReward: campaign.referrerCoinReward,
          referredCashReward: campaign.referredCashReward.toNumber(),
          referredCoinReward: campaign.referredCoinReward,
          endAt: campaign.endAt.toISOString(),
        }
      : {
          name: null,
          referrerCashReward: settings.referrerCashReward.toNumber(),
          referrerCoinReward: settings.referrerCoinReward,
          referredCashReward: settings.referredCashReward.toNumber(),
          referredCoinReward: settings.referredCoinReward,
          endAt: null,
        },
  }
}

export async function getMyReferralStats(playerId: string) {
  const [statusCounts, cashSum, coinSum] = await Promise.all([
    prisma.referral.groupBy({ by: ["status"], where: { referrerId: playerId }, _count: { _all: true } }),
    prisma.referralRewardTransaction.aggregate({
      where: { playerId, type: "REFERRAL_CASH_REWARD", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.referralRewardTransaction.aggregate({
      where: { playerId, type: "REFERRAL_COIN_REWARD", status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ])

  const byStatus = new Map(statusCounts.map((row) => [row.status, row._count._all]))
  const totalReferrals = statusCounts.reduce((sum, row) => sum + row._count._all, 0)

  return {
    totalReferrals,
    pending: byStatus.get("REGISTERED") ?? 0,
    qualified: byStatus.get("QUALIFIED") ?? 0,
    rewarded: byStatus.get("REWARDED") ?? 0,
    rejected: (byStatus.get("REJECTED") ?? 0) + (byStatus.get("CANCELLED") ?? 0),
    totalCashEarned: cashSum._sum.amount?.toNumber() ?? 0,
    totalCoinsEarned: coinSum._sum.amount?.toNumber() ?? 0,
  }
}

/** First 2 chars + asterisks — enough for a player to recognize "which friend," not enough to expose a full username to someone who only knows the referral relationship. */
function maskUsername(username: string): string {
  return username.length <= 2 ? `${username}***` : `${username.slice(0, 2)}***`
}

export async function getMyReferralHistory(playerId: string, options: { cursor?: string; limit?: number } = {}) {
  const limit = Math.min(options.limit ?? 20, 100)
  const rows = await prisma.referral.findMany({
    where: { referrerId: playerId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: {
      referred: { select: { username: true, phone: true } },
      rewards: { where: { status: "COMPLETED" }, select: { type: true, amount: true } },
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      friend: maskUsername(row.referred.username),
      phoneMasked: row.referred.phone ? `••••••${row.referred.phone.slice(-4)}` : null,
      registeredAt: row.registeredAt.toISOString(),
      status: row.status,
      qualifiedAt: row.qualifiedAt?.toISOString() ?? null,
      rewardedAt: row.rewardedAt?.toISOString() ?? null,
      cashReward: row.rewards.filter((r) => r.type === "REFERRAL_CASH_REWARD").reduce((sum, r) => sum + r.amount.toNumber(), 0),
      coinReward: row.rewards.filter((r) => r.type === "REFERRAL_COIN_REWARD").reduce((sum, r) => sum + r.amount.toNumber(), 0),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

/**
 * Called once at registration (auth.service.ts register()), best-effort —
 * a referral-attribution failure must never block account creation, so
 * every early return here is a deliberate silent no-op (logged), not a
 * thrown error. Never trusts the code as proof of anything beyond "this is
 * the code the new player typed" — every condition (exists, active,
 * not-self, not-already-attributed, limits) is re-checked server-side.
 */
export async function attributeReferral(
  referredPlayerId: string,
  rawCode: string | undefined | null,
  context: { ip?: string; userAgent?: string }
): Promise<void> {
  if (!rawCode?.trim()) return
  const code = rawCode.trim().toUpperCase()

  const settings = await getSettings()
  if (!settings.enabled) return

  const referrer = await prisma.player.findUnique({ where: { referralCode: code } })
  if (!referrer) {
    logger.info({ code }, "Referral attribution skipped — code does not match any account")
    return
  }
  if (referrer.id === referredPlayerId) return
  if (referrer.status !== "ACTIVE") {
    logger.info({ referrerId: referrer.id }, "Referral attribution skipped — referrer is not active")
    return
  }

  const alreadyAttributed = await prisma.referral.findUnique({ where: { referredId: referredPlayerId } })
  if (alreadyAttributed) return

  if (settings.maxReferredPerUser !== null) {
    const referredCount = await prisma.referral.count({ where: { referrerId: referrer.id, status: { not: "REJECTED" } } })
    if (referredCount >= settings.maxReferredPerUser) {
      logger.info({ referrerId: referrer.id }, "Referral attribution skipped — referrer hit maxReferredPerUser")
      return
    }
  }
  if (settings.dailyReferralLimit !== null) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const count = await prisma.referral.count({ where: { referrerId: referrer.id, createdAt: { gte: since } } })
    if (count >= settings.dailyReferralLimit) {
      logger.info({ referrerId: referrer.id }, "Referral attribution skipped — referrer hit dailyReferralLimit")
      return
    }
  }
  if (settings.monthlyReferralLimit !== null) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const count = await prisma.referral.count({ where: { referrerId: referrer.id, createdAt: { gte: since } } })
    if (count >= settings.monthlyReferralLimit) {
      logger.info({ referrerId: referrer.id }, "Referral attribution skipped — referrer hit monthlyReferralLimit")
      return
    }
  }

  const campaign = await getActiveCampaign()

  let referralId: string
  try {
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referredPlayerId,
        referralCode: code,
        campaignId: campaign?.id ?? null,
        registrationIp: context.ip ?? null,
        registrationUserAgent: context.userAgent ?? null,
      },
    })
    referralId = referral.id
  } catch (err) {
    // Unique violation on referredId — a genuine concurrent double-call is
    // effectively impossible for a single new player id, but the DB
    // constraint is still the real guarantee, not this pre-check above.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return
    throw err
  }

  await runFraudChecks(referralId, referrer.id, context)
  await evaluateQualification(referralId)
}

/**
 * Auto-detected signals only (spec §16-17): no device-fingerprinting infra
 * exists in this codebase, so DUPLICATE_DEVICE/MULTIPLE_ACCOUNTS/
 * UNUSUAL_ACTIVITY are admin-attachable via addRiskFlag but never set
 * here. Flags, never hard-blocks — riskStatus moves to REVIEW, which
 * evaluateQualification/issueReward still allow through; only an admin
 * setting riskStatus to BLOCKED stops the reward engine (spec §16: "do
 * not automatically permanently ban... create risk_flags").
 */
async function runFraudChecks(referralId: string, referrerId: string, context: { ip?: string }): Promise<void> {
  const flags: { type: "DUPLICATE_IP" | "RAPID_REGISTRATION"; detail: string }[] = []

  if (context.ip) {
    const sameIpCount = await prisma.referral.count({
      where: { referrerId, registrationIp: context.ip, id: { not: referralId } },
    })
    if (sameIpCount > 0) {
      flags.push({ type: "DUPLICATE_IP", detail: `${sameIpCount} other referral(s) from this referrer share IP ${context.ip}` })
    }
  }

  const windowStart = new Date(Date.now() - RAPID_REGISTRATION_WINDOW_MINUTES * 60_000)
  const recentCount = await prisma.referral.count({ where: { referrerId, createdAt: { gte: windowStart } } })
  if (recentCount > RAPID_REGISTRATION_THRESHOLD) {
    flags.push({
      type: "RAPID_REGISTRATION",
      detail: `${recentCount} referrals from this referrer in the last ${RAPID_REGISTRATION_WINDOW_MINUTES} minutes`,
    })
  }

  if (flags.length === 0) return

  await prisma.$transaction([
    prisma.referralRiskFlag.createMany({ data: flags.map((f) => ({ referralId, type: f.type, detail: f.detail })) }),
    prisma.referral.update({ where: { id: referralId }, data: { riskStatus: "REVIEW", riskScore: { increment: flags.length * 10 } } }),
  ])
}

async function sumLedger(playerId: string, type: "DEPOSIT" | "BET"): Promise<Prisma.Decimal> {
  const result = await prisma.ledgerEntry.aggregate({ where: { playerId, type }, _sum: { amount: true } })
  return new Prisma.Decimal(result._sum.amount ?? 0)
}

async function ruleSatisfied(
  referredPlayerId: string,
  rule: ReferralQualificationRule,
  minDeposit: Prisma.Decimal,
  minActivity: Prisma.Decimal,
  kycRequired: boolean
): Promise<boolean> {
  if (kycRequired) {
    const player = await prisma.player.findUnique({ where: { id: referredPlayerId }, select: { kycStatus: true } })
    if (player?.kycStatus !== "APPROVED") return false
  }

  switch (rule) {
    case "REGISTRATION_ONLY":
      return true
    case "VERIFICATION": {
      const player = await prisma.player.findUnique({ where: { id: referredPlayerId }, select: { kycStatus: true } })
      return player?.kycStatus === "APPROVED"
    }
    case "DEPOSIT": {
      const deposited = await sumLedger(referredPlayerId, "DEPOSIT")
      return deposited.gte(minDeposit)
    }
    case "ACTIVITY": {
      const wagered = await sumLedger(referredPlayerId, "BET")
      return wagered.abs().gte(minActivity)
    }
    case "MULTIPLE": {
      const [deposited, wagered] = await Promise.all([sumLedger(referredPlayerId, "DEPOSIT"), sumLedger(referredPlayerId, "BET")])
      return deposited.gte(minDeposit) && wagered.abs().gte(minActivity)
    }
  }
}

/**
 * Server-side qualification check (spec §8) — re-evaluated from scratch on
 * every call (idempotent by construction: re-checking an already-QUALIFIED
 * or REWARDED referral is a fast no-op via the status guard below), so
 * every caller (attribution, deposit callback, bet webhook, KYC approval)
 * can call this the same way without worrying about double-triggering a
 * reward — issueReward()'s own per-movement idempotency is the real
 * guarantee against that, this is just the gate that decides whether to
 * try at all.
 */
export async function evaluateQualification(referralId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { id: referralId }, include: { campaign: true } })
  if (!referral) return
  if (referral.status === "REJECTED" || referral.status === "CANCELLED") return
  if (referral.riskStatus === "BLOCKED") return

  const settings = await getSettings()
  const rule = referral.campaign?.qualificationRule ?? settings.qualificationRule
  const minDeposit = referral.campaign?.minDepositAmount ?? settings.minDepositAmount
  const minActivity = referral.campaign?.minActivityAmount ?? settings.minActivityAmount

  if (referral.status !== "QUALIFIED" && referral.status !== "REWARDED") {
    const satisfied = await ruleSatisfied(referral.referredId, rule, minDeposit, minActivity, settings.kycRequired)
    if (!satisfied) return
    await prisma.referral.update({ where: { id: referral.id }, data: { status: "QUALIFIED", qualifiedAt: new Date() } })
  }

  await issueReward(referral.id)
}

/**
 * Looks up whichever referral (if any) has this player as the REFERRED
 * side and re-evaluates it — the shape every qualification trigger site
 * (deposit callback, bet webhook, KYC approval) actually calls, so they
 * don't each need to know how to find the referral row themselves. A
 * cheap indexed unique lookup even once a referral is long since REWARDED,
 * so it's safe to call unconditionally on every deposit/bet.
 */
export async function evaluateQualificationForPlayer(playerId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { referredId: playerId }, select: { id: true, status: true } })
  if (!referral || referral.status === "REWARDED" || referral.status === "REJECTED" || referral.status === "CANCELLED") return
  await evaluateQualification(referral.id)
}

/**
 * Same as evaluateQualificationForPlayer, keyed by externalId instead —
 * for the gaming webhook specifically (gaming-webhook.service.ts), which
 * only has request.user_id (=externalId) on every single bet event and
 * would otherwise need an extra Player lookup just to get our internal id
 * before it could even ask "is this player referred at all." One joined
 * query instead of two round trips on the hottest path in the system.
 */
export async function evaluateQualificationForExternalId(externalId: string): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { referred: { externalId } },
    select: { id: true, status: true },
  })
  if (!referral || referral.status === "REWARDED" || referral.status === "REJECTED" || referral.status === "CANCELLED") return
  await evaluateQualification(referral.id)
}

/**
 * The one place a referral reward ever credits a wallet. Idempotent per
 * `reference` (spec §7/§30): the DB-level unique constraint on
 * ReferralRewardTransaction.reference is the real guarantee — the
 * findUnique check below is just a fast-path that avoids taking the wallet
 * lock at all for the common case, not the guarantee itself. Same
 * FOR UPDATE row-lock pattern as wallet.service.ts's applyLedgerEntry.
 */
async function creditBonus(
  playerId: string,
  field: "bonusBalance" | "bonusCoinBalance",
  amount: number,
  reference: string,
  meta: { referralId: string; type: ReferralRewardTxType; description: string }
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
        if (!wallet) throw new ReferralError("WALLET_NOT_FOUND", `No wallet provisioned for player ${playerId}`)
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
          },
        })
      } else {
        const walletRows = await tx.$queryRaw<{ id: string; bonusCoinBalance: number }[]>`
          SELECT id, "bonusCoinBalance" FROM wallets WHERE "playerId" = ${playerId} FOR UPDATE
        `
        const wallet = walletRows[0]
        if (!wallet) throw new ReferralError("WALLET_NOT_FOUND", `No wallet provisioned for player ${playerId}`)
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
          },
        })
      }
      return true
    })
  } catch (err) {
    // Lost a race to a concurrent identical credit (two simultaneous
    // qualification triggers) — the other request already completed this
    // exact idempotent movement. Not an error, just nothing left to do.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false
    throw err
  }
}

/**
 * Issues up to 4 independent, individually idempotent credits (referrer
 * cash/coin, referred cash/coin) — deliberately 4 separate transactions
 * rather than one spanning both players' wallets: avoids lock-ordering
 * deadlock risk between two different wallets, and means a crash partway
 * through leaves the remaining credits safely retryable (every caller of
 * evaluateQualification re-runs this and each already-completed movement
 * is a no-op via creditBonus's own idempotency).
 */
export async function issueReward(referralId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { id: referralId }, include: { campaign: true } })
  if (!referral) return
  if (referral.status !== "QUALIFIED" && referral.status !== "REWARDED") return
  if (referral.riskStatus === "BLOCKED") return

  const settings = await getSettings()
  const referrerCash = (referral.campaign?.referrerCashReward ?? settings.referrerCashReward).toNumber()
  const referrerCoin = referral.campaign?.referrerCoinReward ?? settings.referrerCoinReward
  const referredCash = (referral.campaign?.referredCashReward ?? settings.referredCashReward).toNumber()
  const referredCoin = referral.campaign?.referredCoinReward ?? settings.referredCoinReward
  const expiryDays = referral.campaign?.expiryDays ?? settings.rewardExpiryDays
  const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null

  let anyCredited = false
  if (referrerCash > 0) {
    anyCredited =
      (await creditBonus(referral.referrerId, "bonusBalance", referrerCash, `referral:${referral.id}:referrer:cash`, {
        referralId: referral.id,
        type: "REFERRAL_CASH_REWARD",
        description: "Referral cash reward",
      })) || anyCredited
  }
  if (referrerCoin > 0) {
    anyCredited =
      (await creditBonus(referral.referrerId, "bonusCoinBalance", referrerCoin, `referral:${referral.id}:referrer:coin`, {
        referralId: referral.id,
        type: "REFERRAL_COIN_REWARD",
        description: "Referral coin reward",
      })) || anyCredited
  }
  if (referredCash > 0) {
    anyCredited =
      (await creditBonus(referral.referredId, "bonusBalance", referredCash, `referral:${referral.id}:referred:cash`, {
        referralId: referral.id,
        type: "REFERRAL_CASH_REWARD",
        description: "Welcome bonus (referred)",
      })) || anyCredited
  }
  if (referredCoin > 0) {
    anyCredited =
      (await creditBonus(referral.referredId, "bonusCoinBalance", referredCoin, `referral:${referral.id}:referred:coin`, {
        referralId: referral.id,
        type: "REFERRAL_COIN_REWARD",
        description: "Welcome bonus (referred)",
      })) || anyCredited
  }

  if (expiresAt) {
    await prisma.referralRewardTransaction.updateMany({
      where: { referralId: referral.id, expiresAt: null, status: "COMPLETED" },
      data: { expiresAt },
    })
  }

  if (referral.status !== "REWARDED") {
    await prisma.referral.update({ where: { id: referral.id }, data: { status: "REWARDED", rewardedAt: new Date() } })
  }

  if (!anyCredited) return

  const [referrer, referred] = await Promise.all([
    prisma.player.findUnique({ where: { id: referral.referrerId }, select: { externalId: true } }),
    prisma.player.findUnique({ where: { id: referral.referredId }, select: { externalId: true } }),
  ])
  if (referrer) {
    await publishPlayerNotification(referrer.externalId, {
      message: `You earned a referral reward: ₹${referrerCash} + ${referrerCoin} coins.`,
      link: "/dashboard/refer-earn",
    })
  }
  if (referred) {
    await publishPlayerNotification(referred.externalId, {
      message: `Welcome bonus unlocked: ₹${referredCash} + ${referredCoin} coins.`,
      link: "/dashboard/refer-earn",
    })
  }
}
