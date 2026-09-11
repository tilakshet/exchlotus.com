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

  /**
   * Withdrawable = balance minus whatever deposit is still UNTOUCHED (never
   * wagered). Once part of the deposit is bet — win or lose — that portion
   * stops being "protected": a loss spends it, a win returns it as free
   * cash alongside the profit. Deposit 500, bet 200, win a 600 payout ->
   * balance 900. Untouched deposit = 500-200 = 300, so withdrawable =
   * 900-300 = 600 (the ₹400 profit + the ₹200 of deposit that was put at
   * risk and came back) — not just the ₹400 profit, and not the full ₹900.
   */
  it("frees a wagered portion of the deposit once it's won back, but keeps the untouched remainder locked", async () => {
    await prisma.wallet.update({ where: { playerId }, data: { balance: 0 } })
    await prisma.ledgerEntry.create({
      data: { playerId, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 500, balanceAfter: 500 },
    })
    await prisma.ledgerEntry.create({
      data: { playerId, type: "BET", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: -200, balanceAfter: 300 },
    })
    await prisma.ledgerEntry.create({
      data: { playerId, type: "WIN", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 600, balanceAfter: 900 },
    })
    await prisma.wallet.update({ where: { playerId }, data: { balance: 900 } })

    // The 400 profit + the 200 of deposit that was wagered and returned...
    const result = await requestWithdrawal(externalId, bankAccountId, 600)
    expect(result.balance).toBe(300)
    expect(result.lockedBalance).toBe(600)

    // ...but the untouched 300 of deposit is not reachable, even by ₹1.
    const error = await requestWithdrawal(externalId, bankAccountId, 1).catch((e) => e)
    expect(error).toBeInstanceOf(GamingApiError)
  })

  /**
   * Once cumulative lifetime wagering reaches the full deposit — even
   * spread across several losing bets before a win — none of the deposit
   * is "untouched" anymore, so the entire balance becomes withdrawable.
   * Deposit 500 -> lose 100, 100, 200 (balance 100) -> bet 100, win a 700
   * payout (balance 700). Total ever wagered = 500 = the whole deposit, so
   * withdrawable = the full 700, not just the 200 net profit.
   */
  it("frees the entire balance once lifetime wagering has used up the whole deposit", async () => {
    await prisma.wallet.update({ where: { playerId }, data: { balance: 0 } })
    await prisma.ledgerEntry.create({
      data: { playerId, type: "DEPOSIT", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 500, balanceAfter: 500 },
    })
    let running = 500
    for (const stake of [100, 100, 200, 100]) {
      running -= stake
      await prisma.ledgerEntry.create({
        data: { playerId, type: "BET", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: -stake, balanceAfter: running },
      })
    }
    running += 700
    await prisma.ledgerEntry.create({
      data: { playerId, type: "WIN", transactionId: randomUUID(), roundId: "test", gameId: "wallet", amount: 700, balanceAfter: running },
    })
    await prisma.wallet.update({ where: { playerId }, data: { balance: running } })

    const result = await requestWithdrawal(externalId, bankAccountId, 700)
    expect(result.balance).toBe(0)
    expect(result.lockedBalance).toBe(700)
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
