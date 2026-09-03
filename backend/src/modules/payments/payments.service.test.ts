import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { generateGatewayOrderId, handlePayinCallback } from "./payments.service"

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
