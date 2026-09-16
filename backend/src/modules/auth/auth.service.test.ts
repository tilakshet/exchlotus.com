import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { WELCOME_BONUS_COINS, REFERRAL_JOIN_BONUS_COINS } from "../../lib/bonusConfig"
import { hashPassword } from "./password.util"
import { register, sendPasswordResetOtp, verifyOtp } from "./auth.service"
import { AuthError } from "./auth.errors"
import { ensureReferralCode } from "../referral/referral.service"

const TEST_OTP_CODE = "424242"

async function seedVerifiedOtp(phone: string) {
  await prisma.otpCode.create({
    data: { phone, codeHash: await hashPassword(TEST_OTP_CODE), expiresAt: new Date(Date.now() + 5 * 60_000), consumedAt: new Date() },
  })
}

async function seedUnconsumedOtp(phone: string) {
  await prisma.otpCode.create({
    data: { phone, codeHash: await hashPassword(TEST_OTP_CODE), expiresAt: new Date(Date.now() + 5 * 60_000) },
  })
}

function randomPhone(): string {
  return `+1555${Math.floor(1_000_000 + Math.random() * 8_999_999)}`
}

describe("auth.service — welcome bonus + referral attribution on signup", () => {
  const createdPlayerIds: string[] = []
  const createdPhones: string[] = []

  beforeEach(async () => {
    await prisma.referralSettings.upsert({
      where: { id: "default" },
      update: { enabled: true, qualificationRule: "REGISTRATION_ONLY" },
      create: { id: "default", enabled: true, qualificationRule: "REGISTRATION_ONLY" },
    })
  })

  afterEach(async () => {
    const ids = createdPlayerIds.splice(0)
    const phones = createdPhones.splice(0)
    await prisma.bonusTransaction.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: ids } }, { referredId: { in: ids } }] } })
    await prisma.refreshToken.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.loginEvent.deleteMany({ where: { phone: { in: phones } } })
    await prisma.otpCode.deleteMany({ where: { phone: { in: phones } } })
    await prisma.wallet.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.player.deleteMany({ where: { id: { in: ids } } })
  })

  it("register(): a brand-new account is awarded the welcome bonus exactly once", async () => {
    const phone = randomPhone()
    createdPhones.push(phone)
    await seedVerifiedOtp(phone)

    const tokens = await register({ username: `wb-${phone.slice(-4)}`, phone, password: "SuperSecret1!", gender: "OTHER" })
    const player = await prisma.player.findUniqueOrThrow({ where: { phone } })
    createdPlayerIds.push(player.id)
    expect(tokens.accessToken).toBeTruthy()

    // Best-effort/fire-and-forget in auth.service.ts — give it a tick to land.
    await new Promise((r) => setTimeout(r, 50))

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(WELCOME_BONUS_COINS)

    const rows = await prisma.bonusTransaction.findMany({ where: { playerId: player.id, type: "WELCOME_BONUS" } })
    expect(rows).toHaveLength(1)
  })

  it("register(): attributes the referral join bonus to the referrer when a valid referral code is supplied", async () => {
    const referrerPhone = randomPhone()
    createdPhones.push(referrerPhone)
    const referrer = await prisma.player.create({
      data: { externalId: randomUUID(), username: `ref-${referrerPhone.slice(-4)}`, phone: referrerPhone, wallet: { create: { balance: 0, currency: "INR" } } },
    })
    createdPlayerIds.push(referrer.id)
    const code = await ensureReferralCode(referrer.id)

    const referredPhone = randomPhone()
    createdPhones.push(referredPhone)
    await seedVerifiedOtp(referredPhone)

    await register({ username: `wb-${referredPhone.slice(-4)}`, phone: referredPhone, password: "SuperSecret1!", gender: "OTHER", referralCode: code })
    const referred = await prisma.player.findUniqueOrThrow({ where: { phone: referredPhone } })
    createdPlayerIds.push(referred.id)

    await new Promise((r) => setTimeout(r, 50))

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS)

    const referredWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referred.id } })
    expect(referredWallet.bonusCoinBalance).toBe(WELCOME_BONUS_COINS) // welcome bonus only, never referral coins
  })

  it("verifyOtp(): a brand-new OTP signup is awarded the welcome bonus and attributes referral (fixes the pre-existing OTP attribution gap)", async () => {
    const referrerPhone = randomPhone()
    createdPhones.push(referrerPhone)
    const referrer = await prisma.player.create({
      data: { externalId: randomUUID(), username: `ref-${referrerPhone.slice(-4)}`, phone: referrerPhone, wallet: { create: { balance: 0, currency: "INR" } } },
    })
    createdPlayerIds.push(referrer.id)
    const code = await ensureReferralCode(referrer.id)

    const newPhone = randomPhone()
    createdPhones.push(newPhone)
    await seedUnconsumedOtp(newPhone)

    await verifyOtp(newPhone, TEST_OTP_CODE, code)
    const newPlayer = await prisma.player.findUniqueOrThrow({ where: { phone: newPhone } })
    createdPlayerIds.push(newPlayer.id)

    await new Promise((r) => setTimeout(r, 50))

    const newPlayerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: newPlayer.id } })
    expect(newPlayerWallet.bonusCoinBalance).toBe(WELCOME_BONUS_COINS)

    const referral = await prisma.referral.findUnique({ where: { referredId: newPlayer.id } })
    expect(referral?.referrerId).toBe(referrer.id)

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrer.id } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS)
  })

  it("verifyOtp(): logging into an EXISTING account never re-awards the welcome bonus", async () => {
    const phone = randomPhone()
    createdPhones.push(phone)
    await seedUnconsumedOtp(phone)
    await verifyOtp(phone, TEST_OTP_CODE)
    const player = await prisma.player.findUniqueOrThrow({ where: { phone } })
    createdPlayerIds.push(player.id)
    await new Promise((r) => setTimeout(r, 50))

    // Second login, same account — a fresh OTP is required (the first was consumed).
    await seedUnconsumedOtp(phone)
    await verifyOtp(phone, TEST_OTP_CODE)
    await new Promise((r) => setTimeout(r, 50))

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: player.id } })
    expect(wallet.bonusCoinBalance).toBe(WELCOME_BONUS_COINS) // still exactly one award

    const rows = await prisma.bonusTransaction.findMany({ where: { playerId: player.id, type: "WELCOME_BONUS" } })
    expect(rows).toHaveLength(1)
  })
})

describe("auth.service — sendPasswordResetOtp (Forgot Password Send OTP)", () => {
  const createdPlayerIds: string[] = []
  const createdPhones: string[] = []

  afterEach(async () => {
    const ids = createdPlayerIds.splice(0)
    const phones = createdPhones.splice(0)
    await prisma.otpCode.deleteMany({ where: { phone: { in: phones } } })
    await prisma.wallet.deleteMany({ where: { playerId: { in: ids } } })
    await prisma.player.deleteMany({ where: { id: { in: ids } } })
  })

  async function makeActivePlayer() {
    const phone = randomPhone()
    createdPhones.push(phone)
    const player = await prisma.player.create({
      data: { externalId: randomUUID(), username: `fp-${phone.slice(-4)}`, phone, status: "ACTIVE", wallet: { create: { balance: 0, currency: "INR" } } },
    })
    createdPlayerIds.push(player.id)
    return { player, phone }
  }

  it("an existing active user's Send OTP succeeds and creates exactly one OTP record", async () => {
    const { phone } = await makeActivePlayer()

    await expect(sendPasswordResetOtp(phone)).resolves.toBeDefined()

    const rows = await prisma.otpCode.findMany({ where: { phone } })
    expect(rows).toHaveLength(1)
  })

  it("a phone number with no account (e.g. a deleted user) is rejected with ACCOUNT_NOT_FOUND, and no OTP record is created", async () => {
    const phone = randomPhone()
    createdPhones.push(phone)
    // Deliberately no player created for this phone — simulates a deleted account.

    const error = await sendPasswordResetOtp(phone).catch((e) => e)
    expect(error).toBeInstanceOf(AuthError)
    expect(error.code).toBe("ACCOUNT_NOT_FOUND")

    const rows = await prisma.otpCode.findMany({ where: { phone } })
    expect(rows).toHaveLength(0)
  })

  it("repeated Send OTP calls for a non-existent number never create an OTP record", async () => {
    const phone = randomPhone()
    createdPhones.push(phone)

    await sendPasswordResetOtp(phone).catch(() => {})
    await sendPasswordResetOtp(phone).catch(() => {})
    await sendPasswordResetOtp(phone).catch(() => {})

    const rows = await prisma.otpCode.findMany({ where: { phone } })
    expect(rows).toHaveLength(0)
  })

  it("a suspended account is rejected with ACCOUNT_SUSPENDED, and no OTP record is created", async () => {
    const phone = randomPhone()
    createdPhones.push(phone)
    const player = await prisma.player.create({
      data: { externalId: randomUUID(), username: `fp-susp-${phone.slice(-4)}`, phone, status: "SUSPENDED", wallet: { create: { balance: 0, currency: "INR" } } },
    })
    createdPlayerIds.push(player.id)

    const error = await sendPasswordResetOtp(phone).catch((e) => e)
    expect(error).toBeInstanceOf(AuthError)
    expect(error.code).toBe("ACCOUNT_SUSPENDED")

    const rows = await prisma.otpCode.findMany({ where: { phone } })
    expect(rows).toHaveLength(0)
  })
})
