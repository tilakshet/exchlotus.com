import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { handlePayinCallback } from "./payments.service"

/**
 * Integration tests against the real local dev database — payments.service
 * does raw $queryRaw row-locking (via applyLedgerEntry) that a Prisma mock
 * can't meaningfully stand in for, so this exercises the actual DB path,
 * same as the manual concurrency test documented in backend/README.md.
 */
describe("payments.service handlePayinCallback", () => {
  let playerId: string
  let externalId: string

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
    const order = await prisma.paymentOrder.create({ data: { playerId, amount: 500 } })

    await handlePayinCallback({ order_id: order.id, amount: 500, status: "success" })
    await handlePayinCallback({ order_id: order.id, amount: 500, status: "success" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(500)

    const entries = await prisma.ledgerEntry.findMany({ where: { playerId, type: "DEPOSIT" } })
    expect(entries).toHaveLength(1)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("SUCCESS")
  })

  it("refuses to credit when the callback amount doesn't match the order", async () => {
    const order = await prisma.paymentOrder.create({ data: { playerId, amount: 500 } })

    await handlePayinCallback({ order_id: order.id, amount: 999, status: "success" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(0)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("PENDING")
  })

  it("ignores a callback for an order id it never created", async () => {
    await expect(handlePayinCallback({ order_id: randomUUID(), amount: 500, status: "success" })).resolves.toBeUndefined()
  })

  it("marks the order FAILED on a non-success callback, without crediting", async () => {
    const order = await prisma.paymentOrder.create({ data: { playerId, amount: 500 } })

    await handlePayinCallback({ order_id: order.id, amount: 500, status: "failed" })

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(0)

    const updatedOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe("FAILED")
  })
})
