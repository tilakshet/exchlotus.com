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
        // These tests are about the balance/bank-account logic, not the KYC
        // gate — approved up front so they exercise what they're meant to.
        // The gate itself is covered by its own test below.
        kycStatus: "APPROVED",
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
    await prisma.ledgerEntry.deleteMany({ where: { playerId } })
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

  it("only allows withdrawing net winnings above deposited principal, even after the deposit itself was wagered and won back", async () => {
    // Reset the fixture wallet to a clean, fully-tracked state — beforeEach
    // gives it balance 1000 with no ledger trail, which isn't useful for
    // this test's exact numbers.
    await prisma.wallet.update({ where: { playerId }, data: { balance: 0 } })
    await prisma.ledgerEntry.create({
      data: { playerId, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 10_000, balanceAfter: 10_000 },
    })

    // Wager the entire deposit, then win it back plus ₹5,200 profit — this
    // is the exact regression scenario: once wagered money passed through a
    // WIN and lifetime-wagered caught up to lifetime-deposited (normal,
    // fast-occurring gameplay), the old formula (which let BET/REFUND move
    // the "principal" floor) collapsed depositedPrincipal to 0 and made the
    // ENTIRE balance — deposit included — withdrawable.
    await prisma.ledgerEntry.create({
      data: { playerId, type: "BET", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: -10_000, balanceAfter: 0 },
    })
    await prisma.ledgerEntry.create({
      data: { playerId, type: "WIN", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 15_200, balanceAfter: 15_200 },
    })
    await prisma.wallet.update({ where: { playerId }, data: { balance: 15_200 } })

    // Exactly the true profit (₹5,200) is withdrawable...
    const result = await requestWithdrawal(externalId, bankAccountId, 5_200)
    expect(result.balance).toBe(10_000)
    expect(result.lockedBalance).toBe(5_200)

    // ...but the original ₹10,000 deposit underneath it is not, even by ₹1.
    const error = await requestWithdrawal(externalId, bankAccountId, 1).catch((e) => e)
    expect(error).toBeInstanceOf(GamingApiError)

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(10_000)
    expect(wallet.lockedBalance.toNumber()).toBe(5_200)
  })

  it("rejects a withdrawal from a player who isn't KYC-approved", async () => {
    await prisma.player.update({ where: { id: playerId }, data: { kycStatus: "PENDING" } })

    const error = await requestWithdrawal(externalId, bankAccountId, 100).catch((e) => e)
    expect(error).toBeInstanceOf(WalletError)
    expect(error.code).toBe("KYC_REQUIRED")

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(1000)
    expect(wallet.lockedBalance.toNumber()).toBe(0)
  })
})
