import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../../lib/prisma"
import { GamingApiError } from "../../lib/api-error"
import { applyLedgerEntry, requestWithdrawal, WalletError } from "./wallet.service"

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

  /** Drives a ledger movement through the real applyLedgerEntry code path (which also maintains wallet.protectedPrincipal), rather than hand-inserting rows. */
  function move(type: "DEPOSIT" | "BET" | "REFUND" | "WIN" | "ADJUSTMENT", amount: number) {
    return applyLedgerEntry({
      playerExternalId: externalId,
      type,
      transactionId: randomUUID(),
      roundId: "test",
      gameId: "wallet",
      amount,
    })
  }

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
    await move("DEPOSIT", 500)
    await move("BET", -200)
    await move("WIN", 600)

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
    await move("DEPOSIT", 500)
    await move("BET", -100)
    await move("BET", -100)
    await move("BET", -200)
    await move("BET", -100)
    await move("WIN", 700)

    const result = await requestWithdrawal(externalId, bankAccountId, 700)
    expect(result.balance).toBe(0)
    expect(result.lockedBalance).toBe(700)
  })

  /**
   * Regression for the production bug: wallet.protectedPrincipal is a
   * RUNNING value clamped at 0 on every single ledger write — not a lifetime
   * SUM floored once at the end. Break-even churn (bet then win the same
   * stake back, repeatedly) drives cumulative lifetime wagering past
   * cumulative lifetime deposits, which floors protectedPrincipal to 0 and
   * — with the old "aggregate the whole history, floor once" formula —
   * left it stuck at 0 forever after, so any LATER deposit was immediately
   * 100% withdrawable. Confirms a fresh deposit made after that point is
   * still fully protected.
   */
  it("keeps a later deposit protected even after historical lifetime wagering exceeded historical lifetime deposits", async () => {
    await prisma.wallet.update({ where: { playerId }, data: { balance: 0 } })
    await move("DEPOSIT", 500)
    // Five break-even bet/win cycles: cumulative wagering (-500) matches the
    // deposit exactly, driving protectedPrincipal to 0 while balance stays 500.
    for (let i = 0; i < 5; i++) {
      await move("BET", -100)
      await move("WIN", 100)
    }
    const midWallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(midWallet.balance.toNumber()).toBe(500)
    expect(midWallet.protectedPrincipal.toNumber()).toBe(0)

    // A brand new deposit now must be fully protected again...
    await move("DEPOSIT", 300)
    await move("BET", -20)
    await move("WIN", 76.8)
    // balance = 500 + 300 - 20 + 76.8 = 856.8; protected = 300 - 20 = 280
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { playerId } })
    expect(wallet.balance.toNumber()).toBe(856.8)
    expect(wallet.protectedPrincipal.toNumber()).toBe(280)

    const result = await requestWithdrawal(externalId, bankAccountId, 576.8)
    expect(result.balance).toBe(280)
    expect(result.lockedBalance).toBe(576.8)

    const error = await requestWithdrawal(externalId, bankAccountId, 1).catch((e) => e)
    expect(error).toBeInstanceOf(GamingApiError)
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
