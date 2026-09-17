import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { REFERRAL_FIRST_DEPOSIT_BONUS_COINS, REFERRAL_JOIN_BONUS_COINS } from "../../lib/bonusConfig"
import { attributeReferral, checkFirstDepositReferralBonus, ensureReferralCode, evaluateQualification, issueReward } from "./referral.service"

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
    await prisma.bonusTransaction.deleteMany({ where: { playerId: { in: ids } } })
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

  it("attributes a referral: referrer gets the immediate join bonus + auto-qualified cash reward, referred gets ZERO referral coins", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)

    await attributeReferral(referred.id, code, { ip: "1.2.3.4" })

    const referral = await prisma.referral.findUniqueOrThrow({ where: { referredId: referred.id } })
    expect(referral.referrerId).toBe(referrer.id)
    expect(referral.status).toBe("REWARDED") // REGISTRATION_ONLY auto-satisfies the cash reward too
    expect(referral.rewardedAt).not.toBeNull()

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusBalance.toNumber()).toBe(100) // cash reward, from ReferralSettings
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS) // fixed join bonus, from bonusConfig — not settings

    // The referred user NEVER receives referral coins or cash — only the
    // separate Welcome Bonus (awarded at signup by auth.service.ts, not by
    // attributeReferral itself, so it's untouched — 0 — in this unit test).
    const referredWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referred.id } })
    expect(referredWallet.bonusBalance.toNumber()).toBe(0)
    expect(referredWallet.bonusCoinBalance).toBe(0)

    const rewardRows = await prisma.bonusTransaction.findMany({ where: { referralId: referral.id } })
    expect(rewardRows).toHaveLength(2) // referrer join-bonus coins + referrer cash reward
    expect(rewardRows.every((r) => r.playerId === referrer.id)).toBe(true)
  })

  it("awards the referral join bonus exactly once, even under a concurrent duplicate attribution attempt", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)

    // The referredId unique constraint means a real second attribution is
    // impossible once the first commits — but the join-bonus credit itself
    // must still be idempotent per its own reference, exercised directly.
    await attributeReferral(referred.id, code, { ip: "1.2.3.4" })
    await attributeReferral(referred.id, code, { ip: "1.2.3.4" })

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS)
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

  it("issueReward is idempotent — calling it twice credits the cash reward only once", async () => {
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
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS)

    const rewardRows = await prisma.bonusTransaction.findMany({ where: { referralId: referral.id } })
    expect(rewardRows).toHaveLength(2) // join-bonus coins + cash reward, each exactly once
  })

  it("concurrent qualification triggers never double-credit the cash reward (spec §30)", async () => {
    // DEPOSIT rule so the referral's CASH reward starts unqualified (the
    // join bonus already fired at attribution, unconditionally) — lets us
    // race two genuinely concurrent evaluateQualification calls against the
    // same not-yet-qualified referral.
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

    const rewardRows = await prisma.bonusTransaction.findMany({ where: { referralId: referral.id, type: "REFERRAL_CASH_REWARD", playerId: referrer.id } })
    expect(rewardRows).toHaveLength(1)
  })

  it("checkFirstDepositReferralBonus: referrer gets +5,000 coins on the referred player's first successful deposit, referred gets 0", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)
    await attributeReferral(referred.id, code, {})

    await prisma.ledgerEntry.create({
      data: { playerId: referred.id, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 500, balanceAfter: 500 },
    })
    await checkFirstDepositReferralBonus(referred.id)

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS + REFERRAL_FIRST_DEPOSIT_BONUS_COINS)

    const referredWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referred.id } })
    expect(referredWallet.bonusCoinBalance).toBe(0)
  })

  it("checkFirstDepositReferralBonus: a second deposit does not trigger a second reward", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)
    await attributeReferral(referred.id, code, {})

    await prisma.ledgerEntry.create({
      data: { playerId: referred.id, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 500, balanceAfter: 500 },
    })
    await checkFirstDepositReferralBonus(referred.id)

    await prisma.ledgerEntry.create({
      data: { playerId: referred.id, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 1000, balanceAfter: 1500 },
    })
    await checkFirstDepositReferralBonus(referred.id)

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS + REFERRAL_FIRST_DEPOSIT_BONUS_COINS)
  })

  it("checkFirstDepositReferralBonus: concurrent calls for the same first deposit only credit once", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)
    await attributeReferral(referred.id, code, {})

    await prisma.ledgerEntry.create({
      data: { playerId: referred.id, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 500, balanceAfter: 500 },
    })

    await Promise.all([checkFirstDepositReferralBonus(referred.id), checkFirstDepositReferralBonus(referred.id)])

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS + REFERRAL_FIRST_DEPOSIT_BONUS_COINS)
  })

  it("checkFirstDepositReferralBonus: no deposit yet means no reward", async () => {
    const referrer = await makePlayer()
    const referred = await makePlayer()
    const code = await ensureReferralCode(referrer.id)
    await attributeReferral(referred.id, code, {})

    await checkFirstDepositReferralBonus(referred.id)

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS) // join bonus only, no first-deposit bonus yet
  })
})
