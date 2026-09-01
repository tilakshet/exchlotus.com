import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { attributeReferral, ensureReferralCode, evaluateQualification, issueReward } from "./referral.service"

async function createPlayer(overrides: { status?: "ACTIVE" | "SUSPENDED" } = {}) {
  const externalId = randomUUID()
  const player = await prisma.player.create({
    data: {
      externalId,
      username: `ref-test-${externalId.slice(0, 8)}`,
      status: overrides.status ?? "ACTIVE",
      wallet: { create: { balance: 0, currency: "INR" } },
    },
  })
  return player
}

describe("referral.service", () => {
  const createdPlayerIds: string[] = []

  beforeEach(async () => {
    // Deterministic, generous settings for every test — REGISTRATION_ONLY
    // qualifies immediately, small fixed rewards so assertions are exact.
    await prisma.referralSettings.upsert({
      where: { id: "default" },
      update: {
        enabled: true,
        qualificationRule: "REGISTRATION_ONLY",
        referrerCashReward: 100,
        referrerCoinReward: 500,
        referredCashReward: 50,
        referredCoinReward: 250,
        maxReferredPerUser: null,
        dailyReferralLimit: null,
        monthlyReferralLimit: null,
        kycRequired: false,
      },
      create: {
        id: "default",
        enabled: true,
        qualificationRule: "REGISTRATION_ONLY",
        referrerCashReward: 100,
        referrerCoinReward: 500,
        referredCashReward: 50,
        referredCoinReward: 250,
      },
    })
  })

  afterEach(async () => {
    const ids = createdPlayerIds.splice(0)
    await prisma.referralRewardTransaction.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.referralRiskFlag.deleteMany({ where: { referral: { OR: [{ referrerId: { in: ids } }, { referredId: { in: ids } }] } } })
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: ids } }, { referredId: { in: ids } }] } })
    await prisma.ledgerEntry.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.wallet.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.player.deleteMany({ where: { id: { in: ids } } })
  })

  async function makePlayer(overrides: { status?: "ACTIVE" | "SUSPENDED" } = {}) {
    const player = await createPlayer(overrides)
    createdPlayerIds.push(player.id)
    return player
  }

  it("generates a unique referral code and is idempotent on repeat calls", async () => {
    const player = await makePlayer()
    const code1 = await ensureReferralCode(player.id)
    const code2 = await ensureReferralCode(player.id)

    expect(code1).toBe(code2)
    expect(code1).toMatch(/^[0-9A-Z]{8}$/)

    const other = await makePlayer()
    const otherCode = await ensureReferralCode(other.id)
    expect(otherCode).not.toBe(code1)
  })

  it("attributes a referral, auto-qualifies under REGISTRATION_ONLY, and issues both rewards exactly once", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)

    await attributeReferral(referred.id, code, { ip: "1.2.3.4" })

    const referral = await prisma.referral.findUniqueOrThrow({ where: { referredId: referred.id } })
    expect(referral.referrerId).toBe(referrer.id)
    expect(referral.status).toBe("REWARDED")
    expect(referral.rewardedAt).not.toBeNull()

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusBalance.toNumber()).toBe(100)
    expect(referrerWallet.bonusCoinBalance).toBe(500)

    const referredWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referred.id } })
    expect(referredWallet.bonusBalance.toNumber()).toBe(50)
    expect(referredWallet.bonusCoinBalance).toBe(250)

    const rewardRows = await prisma.referralRewardTransaction.findMany({ where: { referralId: referral.id } })
    expect(rewardRows).toHaveLength(4) // referrer cash, referrer coin, referred cash, referred coin
  })

  it("does not attribute a referral when the code is unknown (silent no-op, never blocks signup)", async () => {
    const referred = await makePlayer()
    await expect(attributeReferral(referred.id, "NOTAREALCODE", {})).resolves.toBeUndefined()

    const referral = await prisma.referral.findUnique({ where: { referredId: referred.id } })
    expect(referral).toBeNull()
  })

  it("does not attribute a referral when the referrer is suspended", async () => {
    const referrer = await makePlayer({ status: "SUSPENDED" })
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)

    await attributeReferral(referred.id, code, {})

    const referral = await prisma.referral.findUnique({ where: { referredId: referred.id } })
    expect(referral).toBeNull()
  })

  it("rejects self-referral (a player can't refer themselves)", async () => {
    const player = await makePlayer()
    const code = await ensureReferralCode(player.id)

    await attributeReferral(player.id, code, {})

    const referral = await prisma.referral.findUnique({ where: { referredId: player.id } })
    expect(referral).toBeNull()
  })

  it("never attributes a second referrer to an already-referred account", async () => {
    const referrerA = await makePlayer()
    const referrerB = await makePlayer()
    const referred = await makePlayer()
    const codeA = await ensureReferralCode(referrerA.id)
    const codeB = await ensureReferralCode(referrerB.id)

    await attributeReferral(referred.id, codeA, {})
    await attributeReferral(referred.id, codeB, {})

    const referral = await prisma.referral.findUniqueOrThrow({ where: { referredId: referred.id } })
    expect(referral.referrerId).toBe(referrerA.id)

    const count = await prisma.referral.count({ where: { referredId: referred.id } })
    expect(count).toBe(1)
  })

  it("issueReward is idempotent — calling it twice credits the wallet only once", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)
    await attributeReferral(referred.id, code, {})
    const referral = await prisma.referral.findUniqueOrThrow({ where: { referredId: referred.id } })

    // Already rewarded by attributeReferral's own auto-qualification —
    // calling it again directly must be a safe no-op, not a double credit.
    await issueReward(referral.id)
    await issueReward(referral.id)

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusBalance.toNumber()).toBe(100)

    const rewardRows = await prisma.referralRewardTransaction.findMany({ where: { referralId: referral.id } })
    expect(rewardRows).toHaveLength(4)
  })

  it("concurrent qualification triggers never double-credit the reward (spec §30)", async () => {
    // DEPOSIT rule so the referral starts REGISTERED (not auto-rewarded at
    // attribution) — lets us race two genuinely concurrent
    // evaluateQualification calls against the same not-yet-qualified referral.
    await prisma.referralSettings.update({ where: { id: "default" }, data: { qualificationRule: "DEPOSIT", minDepositAmount: 100 } })

    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)
    await attributeReferral(referred.id, code, {})
    const referral = await prisma.referral.findUniqueOrThrow({ where: { referredId: referred.id } })
    expect(referral.status).toBe("REGISTERED")

    await prisma.ledgerEntry.create({
      data: {
        playerId: referred.id,
        type: "DEPOSIT",
        transactionId: randomUUID(),
        roundId: "test",
        gameId: "test",
        amount: 100,
        balanceAfter: 100,
      },
    })

    await Promise.all([evaluateQualification(referral.id), evaluateQualification(referral.id)])

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusBalance.toNumber()).toBe(100)

    const rewardRows = await prisma.referralRewardTransaction.findMany({ where: { referralId: referral.id, type: "REFERRAL_CASH_REWARD", playerId: referrer.id } })
    expect(rewardRows).toHaveLength(1)
  })
})
