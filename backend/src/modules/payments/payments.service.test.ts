import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { REFERRAL_FIRST_DEPOSIT_BONUS_COINS, REFERRAL_JOIN_BONUS_COINS } from "../../lib/bonusConfig"
import { attributeReferral, ensureReferralCode } from "../referral/referral.service"
import { generateGatewayOrderId, handleHousholdbajarCallback, handlePayinCallback } from "./payments.service"

// checkFirstDepositReferralBonus is fired best-effort (fire-and-forget,
// .catch-logged) from inside handlePayinCallback rather than awaited — a
// short tick lets it land before assertions run, same as this repo's other
// tests of fire-and-forget side effects (see auth.service.test.ts).
function flushMicrotasks() {
  return new Promise((r) => setTimeout(r, 50))
}

/**
 * Integration tests against the real local dev database — payments.service
 * does raw $queryRaw row-locking (via applyLedgerEntry) that a Prisma mock
 * can't meaningfully stand in for, so this exercises the actual DB path,
 * same as the manual concurrency test documented in backend/README.md.
 */
describe("payments.service handlePayinCallback", () => {
  let playerId: string
  let externalId: string

  // Matches the gateway's own floor (MIN_DEPOSIT, payments.validators.ts) —
  // no ceiling on the backend, so any value at or above 300 is a valid
  // amount to exercise these tests with, not just a fixed round number.
  function randomDepositAmount(): number {
    return 300 + Math.floor(Math.random() * 9701)
  }

  beforeEach(async () => {
    externalId = randomUUID()
    const player = await prisma.player.create({
      data: {
        externalId,
        username: "payin-test",
        wallet: { create: { balance: 0, currency: "INR" } },
      },
    })
    playerId = player.id
  })

  afterEach(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { playerId } })
    await prisma.paymentOrder.deleteMany({ where: { playerId } })
    await prisma.wallet.deleteMany({ where: { playerId } })
    await prisma.player.delete({ where: { id: playerId } })
  })

  it("credits the wallet exactly once, even if the callback is delivered twice", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "success" })
    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "success" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(amount)

    const entries = await prisma.ledgerEntry.findMany({ where: { playerId, type: "DEPOSIT" } })
    expect(entries).toHaveLength(1)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("SUCCESS")
  })

  it("refuses to credit when the callback amount doesn't match the order", async () => {
    const orderAmount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount: orderAmount, gatewayOrderId: generateGatewayOrderId() } })

    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount: orderAmount + 100, status: "success" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(0)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("PENDING")
  })

  it("ignores a callback for an order id it never created", async () => {
    await expect(handlePayinCallback({ order_id: generateGatewayOrderId(), amount: randomDepositAmount(), status: "success" })).resolves.toBeUndefined()
  })

  it("marks the order FAILED on a non-success callback, without crediting", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "failed" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(0)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("FAILED")
  })

  it("still resolves a callback for an order created under the earlier hyphen-stripped-UUID scheme", async () => {
    // No gatewayOrderId — simulates a PaymentOrder row from before that
    // column existed, when a stripped PaymentOrder.id was sent to the
    // gateway directly (see fromStrippedUuid in payments.service.ts).
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount } })

    await handlePayinCallback({ order_id: order.id.replace(/-/g, ""), amount, status: "success" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(amount)
  })
})

describe("payments.service handleHousholdbajarCallback", () => {
  let playerId: string

  function randomDepositAmount(): number {
    return 300 + Math.floor(Math.random() * 9701)
  }

  beforeEach(async () => {
    const player = await prisma.player.create({
      data: {
        externalId: randomUUID(),
        username: "housholdbajar-payin-test",
        wallet: { create: { balance: 0, currency: "INR" } },
      },
    })
    playerId = player.id
  })

  afterEach(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { playerId } })
    await prisma.paymentOrder.deleteMany({ where: { playerId } })
    await prisma.wallet.deleteMany({ where: { playerId } })
    await prisma.player.delete({ where: { id: playerId } })
  })

  it("credits the wallet exactly once on a SUCCESS callback, even delivered twice", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handleHousholdbajarCallback({ order_id: order.gatewayOrderId!, amount, payment_status: "SUCCESS" })
    await handleHousholdbajarCallback({ order_id: order.gatewayOrderId!, amount, payment_status: "SUCCESS" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(amount)

    const entries = await prisma.ledgerEntry.findMany({ where: { playerId, type: "DEPOSIT" } })
    expect(entries).toHaveLength(1)
  })

  it("marks the order FAILED on a USER_DROPPED callback, without crediting", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handleHousholdbajarCallback({ order_id: order.gatewayOrderId!, amount, payment_status: "USER_DROPPED" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(0)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("FAILED")
  })

  it("never downgrades an already-SUCCESS order on a later FAILED callback", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handleHousholdbajarCallback({ order_id: order.gatewayOrderId!, amount, payment_status: "SUCCESS" })
    await handleHousholdbajarCallback({ order_id: order.gatewayOrderId!, amount, payment_status: "FAILED" })

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("SUCCESS")

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(amount)
  })

  it("refuses to credit when the callback amount doesn't match the order", async () => {
    const orderAmount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId, amount: orderAmount, gatewayOrderId: generateGatewayOrderId() } })

    await handleHousholdbajarCallback({ order_id: order.gatewayOrderId!, amount: orderAmount + 100, payment_status: "SUCCESS" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(0)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("PENDING")
  })

  it("ignores a callback for an order id it never created, without creating one", async () => {
    await expect(
      handleHousholdbajarCallback({ order_id: generateGatewayOrderId(), amount: randomDepositAmount(), payment_status: "SUCCESS" })
    ).resolves.toBeUndefined()
  })
})

describe("payments.service — referral first-deposit bonus", () => {
  let referrerId: string
  let referredId: string
  let referredExternalId: string
  let referralCode: string

  function randomDepositAmount(): number {
    return 300 + Math.floor(Math.random() * 9701)
  }

  beforeEach(async () => {
    await prisma.referralSettings.upsert({
      where: { id: "default" },
      update: { enabled: true },
      create: { id: "default", enabled: true },
    })

    const referrer = await prisma.player.create({
      data: { externalId: randomUUID(), username: "fdb-referrer", wallet: { create: { balance: 0, currency: "INR" } } },
    })
    referrerId = referrer.id
    referralCode = await ensureReferralCode(referrer.id)

    referredExternalId = randomUUID()
    const referred = await prisma.player.create({
      data: { externalId: referredExternalId, username: "fdb-referred", wallet: { create: { balance: 0, currency: "INR" } } },
    })
    referredId = referred.id
    await attributeReferral(referredId, referralCode, {})
  })

  afterEach(async () => {
    await prisma.bonusTransaction.deleteMany({ where: { playerId: { in: [referrerId, referredId] } } })
    await prisma.referral.deleteMany({ where: { referredId } })
    await prisma.ledgerEntry.deleteMany({ where: { playerId: { in: [referrerId, referredId] } } })
    await prisma.paymentOrder.deleteMany({ where: { playerId: referredId } })
    await prisma.wallet.deleteMany({ where: { playerId: { in: [referrerId, referredId] } } })
    await prisma.player.deleteMany({ where: { id: { in: [referrerId, referredId] } } })
  })

  it("awards the referrer +5,000 coins on the referred player's first successful deposit", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId: referredId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "success" })
    await flushMicrotasks()

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrerId } })
    // Join bonus (attributeReferral, in beforeEach) + first-deposit bonus (this callback).
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS + REFERRAL_FIRST_DEPOSIT_BONUS_COINS)

    const referredWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referredId } })
    expect(referredWallet.bonusCoinBalance).toBe(0)
  })

  it("does not award a second first-deposit bonus for the same referred player's later deposits", async () => {
    const firstAmount = randomDepositAmount()
    const firstOrder = await prisma.paymentOrder.create({ data: { playerId: referredId, amount: firstAmount, gatewayOrderId: generateGatewayOrderId() } })
    await handlePayinCallback({ order_id: firstOrder.gatewayOrderId!, amount: firstAmount, status: "success" })
    await flushMicrotasks()

    const secondAmount = randomDepositAmount()
    const secondOrder = await prisma.paymentOrder.create({ data: { playerId: referredId, amount: secondAmount, gatewayOrderId: generateGatewayOrderId() } })
    await handlePayinCallback({ order_id: secondOrder.gatewayOrderId!, amount: secondAmount, status: "success" })
    await flushMicrotasks()

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrerId } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS + REFERRAL_FIRST_DEPOSIT_BONUS_COINS)
  })

  it("a duplicate callback for the same order does not award the first-deposit bonus twice", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId: referredId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "success" })
    await flushMicrotasks()
    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "success" })
    await flushMicrotasks()

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrerId } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS + REFERRAL_FIRST_DEPOSIT_BONUS_COINS)
  })

  it("a failed/pending deposit never triggers the first-deposit bonus", async () => {
    const amount = randomDepositAmount()
    const order = await prisma.paymentOrder.create({ data: { playerId: referredId, amount, gatewayOrderId: generateGatewayOrderId() } })

    await handlePayinCallback({ order_id: order.gatewayOrderId!, amount, status: "failed" })
    await flushMicrotasks()

    const referrerWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId: referrerId } })
    expect(referrerWallet.bonusCoinBalance).toBe(REFERRAL_JOIN_BONUS_COINS) // join bonus only, no first-deposit bonus
  })
})
