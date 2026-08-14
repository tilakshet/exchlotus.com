import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { GamingApiError } from "../../lib/api-error"
import { requestWithdrawal, WalletError } from "./wallet.service"

describe("wallet.service requestWithdrawal", () => {
  let playerId: string
  let externalId: string
  let bankAccountId: string

  beforeEach(async () => {
    externalId = randomUUID()
    const player = await prisma.player.create({
      data: {
        externalId,
        username: "withdraw-test",
        wallet: { create: { balance: 1000, currency: "INR" } },
      },
    })
    playerId = player.id

    const bankAccount = await prisma.bankAccount.create({
      data: {
        playerId,
        accountHolderName: "Test Player",
        bankName: "Test Bank",
        accountNumber: "123456789012",
        ifsc: "TEST0001234",
      },
    })
    bankAccountId = bankAccount.id
  })

  afterEach(async () => {
    await prisma.withdrawalRequest.deleteMany({ where: { playerId } })
    await prisma.bankAccount.deleteMany({ where: { playerId } })
    await prisma.wallet.deleteMany({ where: { playerId } })
    await prisma.player.delete({ where: { id: playerId } })
  })

  it("moves the amount from balance to lockedBalance and creates a PENDING request", async () => {
    const result = await requestWithdrawal(externalId, bankAccountId, 400)

    expect(result.balance).toBe(600)
    expect(result.lockedBalance).toBe(400)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(600)
    expect(wallet.lockedBalance.toNumber()).toBe(400)

    const request = await prisma.withdrawalRequest.findUniqueOrThrow({ where: { id: result.withdrawalId } })
    expect(request.status).toBe("PENDING")
    expect(request.amount.toNumber()).toBe(400)
  })

  it("rejects a withdrawal larger than the available balance", async () => {
    await expect(requestWithdrawal(externalId, bankAccountId, 5000)).rejects.toBeInstanceOf(GamingApiError)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(1000)
    expect(wallet.lockedBalance.toNumber()).toBe(0)
  })

  it("rejects a bank account that doesn't belong to the caller", async () => {
    await expect(requestWithdrawal(externalId, randomUUID(), 100)).rejects.toBeInstanceOf(WalletError)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(1000)
  })
})
