import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { env } from "../../lib/env"
import { prisma } from "../../lib/prisma"
import { appEvents } from "../../lib/events"
import { GamingApiError } from "../../lib/api-error"
import type {
  ApplyLedgerEntryInput,
  ApplyLedgerEntryResult,
  TransactionHistoryPage,
  WalletDetails,
} from "./wallet.types"

/**
 * The one function every webhook transaction method (bet/win/refund) goes
 * through — and also deposits/withdrawals (see `applyManualAdjustment`
 * below), so every wallet mutation in the system shares one idempotent,
 * row-locked code path. Idempotency per spec §6:
 *
 *  - Unique key is (transactionId, type), not transactionId alone — a
 *    refund may legitimately reuse the bet's transaction_id.
 *  - A duplicate request with the SAME amount is a true replay: return the
 *    balance already recorded, apply nothing twice.
 *  - A duplicate transaction_id with a DIFFERENT amount is a genuine
 *    conflict, not a replay — the spec's DOUBLED_BET error is used here.
 *    (The spec doesn't spell out this distinction explicitly — see
 *    README "Open questions" — this is the most consistent reading of
 *    §6's idempotency rule against §7's DOUBLED_BET error existing at all.)
 *
 * Concurrency: the wallet row is locked (`FOR UPDATE`) for the duration of
 * the check-then-act sequence, so two truly concurrent requests for the
 * same player serialize on that lock rather than racing. The ledger table's
 * DB-level unique constraint is the second line of defense.
 */
export async function applyLedgerEntry(input: ApplyLedgerEntryInput): Promise<ApplyLedgerEntryResult> {
  const player = await prisma.player.findUnique({ where: { externalId: input.playerExternalId } })
  if (!player) {
    throw new GamingApiError("INVALID_USER", `No player found for user_id ${input.playerExternalId}`)
  }

  const result = await prisma.$transaction(async (tx) => {
    const walletRows = await tx.$queryRaw<{ id: string; balance: string }[]>`
      SELECT id, balance FROM wallets WHERE "playerId" = ${player.id} FOR UPDATE
    `
    const wallet = walletRows[0]
    if (!wallet) {
      throw new GamingApiError("INVALID_USER", `No wallet provisioned for user_id ${input.playerExternalId}`)
    }

    const existing = await tx.ledgerEntry.findUnique({
      where: { transactionId_type: { transactionId: input.transactionId, type: input.type } },
    })

    if (existing) {
      const sameAmount = existing.amount.equals(new Prisma.Decimal(input.amount))
      if (!sameAmount) {
        throw new GamingApiError(
          "DOUBLED_BET",
          `transaction_id ${input.transactionId} (${input.type}) was already recorded with a different amount`
        )
      }
      return { balance: existing.balanceAfter.toNumber(), replayed: true }
    }

    const currentBalance = new Prisma.Decimal(wallet.balance)
    const newBalance = currentBalance.plus(input.amount)

    if (newBalance.isNegative()) {
      throw new GamingApiError("NO_BALANCE", `Insufficient balance for player ${input.playerExternalId}`)
    }

    await tx.ledgerEntry.create({
      data: {
        playerId: player.id,
        type: input.type,
        transactionId: input.transactionId,
        roundId: input.roundId,
        gameId: input.gameId,
        sessionId: input.sessionId,
        amount: input.amount,
        balanceAfter: newBalance,
      },
    })
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } })

    return { balance: newBalance.toNumber(), replayed: false }
  })

  if (!result.replayed) {
    appEvents.emit("wallet:changed", { playerExternalId: input.playerExternalId, balance: result.balance })
  }

  return result
}

export async function getWalletBalance(playerExternalId: string): Promise<number> {
  const player = await prisma.player.findUnique({
    where: { externalId: playerExternalId },
    include: { wallet: true },
  })
  if (!player || !player.wallet) {
    throw new GamingApiError("INVALID_USER", `No player/wallet found for user_id ${playerExternalId}`)
  }
  return player.wallet.balance.toNumber()
}

export async function getWalletDetails(playerExternalId: string): Promise<WalletDetails> {
  const player = await prisma.player.findUnique({
    where: { externalId: playerExternalId },
    include: { wallet: true },
  })
  if (!player || !player.wallet) {
    throw new GamingApiError("INVALID_USER", `No player/wallet found for user_id ${playerExternalId}`)
  }
  return {
    balance: player.wallet.balance.toNumber(),
    bonusBalance: player.wallet.bonusBalance.toNumber(),
    lockedBalance: player.wallet.lockedBalance.toNumber(),
    currency: player.wallet.currency,
    updatedAt: player.wallet.updatedAt.toISOString(),
  }
}

export async function listTransactionHistory(
  playerExternalId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<TransactionHistoryPage> {
  const player = await prisma.player.findUnique({ where: { externalId: playerExternalId } })
  if (!player) {
    throw new GamingApiError("INVALID_USER", `No player found for user_id ${playerExternalId}`)
  }

  const limit = Math.min(options.limit ?? 20, 100)
  const rows = await prisma.ledgerEntry.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount.toNumber(),
      balanceAfter: row.balanceAfter.toNumber(),
      gameId: row.gameId,
      roundId: row.roundId,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

export class WalletError extends Error {
  constructor(
    public readonly code: "BANK_ACCOUNT_NOT_FOUND",
    message: string
  ) {
    super(message)
  }
}

/**
 * Instant, unconditional balance credit — dev/test convenience only, hard
 * disabled in production (same gating pattern as the OTP devCode shortcut
 * in auth.service.ts). Real deposits go through
 * payments.service.createDepositOrder + the PayIn callback instead.
 */
export async function applyManualDeposit(playerExternalId: string, amount: number): Promise<ApplyLedgerEntryResult> {
  if (env.NODE_ENV === "production") {
    throw new GamingApiError("INVALID_TRANSACTION", "Manual deposit is disabled in production — use the real payment gateway")
  }
  return applyLedgerEntry({
    playerExternalId,
    type: "DEPOSIT",
    transactionId: randomUUID(),
    roundId: "manual",
    gameId: "wallet",
    amount: Math.abs(amount),
  })
}

/**
 * Requests a withdrawal: reserves `amount` by moving it from `balance` into
 * `lockedBalance` (same FOR UPDATE row-lock as applyLedgerEntry) and creates
 * a PENDING WithdrawalRequest — no money actually leaves and no ledger entry
 * is written yet. An admin approving it in admin/backend is what calls the
 * real payout API and writes the WITHDRAWAL ledger entry; rejecting it
 * releases the lock back to balance. See the payments plan for why: there's
 * no KYC/fraud review today, so nothing pays out unattended.
 */
export async function requestWithdrawal(
  playerExternalId: string,
  bankAccountId: string,
  amount: number
): Promise<{ withdrawalId: string; balance: number; lockedBalance: number }> {
  const player = await prisma.player.findUnique({ where: { externalId: playerExternalId } })
  if (!player) {
    throw new GamingApiError("INVALID_USER", `No player found for user_id ${playerExternalId}`)
  }

  const bankAccount = await prisma.bankAccount.findFirst({ where: { id: bankAccountId, playerId: player.id } })
  if (!bankAccount) {
    throw new WalletError("BANK_ACCOUNT_NOT_FOUND", "Bank account not found")
  }

  return prisma.$transaction(async (tx) => {
    const walletRows = await tx.$queryRaw<{ id: string; balance: string; lockedBalance: string }[]>`
      SELECT id, balance, "lockedBalance" FROM wallets WHERE "playerId" = ${player.id} FOR UPDATE
    `
    const wallet = walletRows[0]
    if (!wallet) {
      throw new GamingApiError("INVALID_USER", `No wallet provisioned for user_id ${playerExternalId}`)
    }

    const decimalAmount = new Prisma.Decimal(amount)
    const currentBalance = new Prisma.Decimal(wallet.balance)
    if (currentBalance.lessThan(decimalAmount)) {
      throw new GamingApiError("NO_BALANCE", "Insufficient balance for withdrawal")
    }

    const newBalance = currentBalance.minus(decimalAmount)
    const newLocked = new Prisma.Decimal(wallet.lockedBalance).plus(decimalAmount)
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance, lockedBalance: newLocked } })

    const withdrawal = await tx.withdrawalRequest.create({
      data: { playerId: player.id, bankAccountId: bankAccount.id, amount: decimalAmount },
    })

    return { withdrawalId: withdrawal.id, balance: newBalance.toNumber(), lockedBalance: newLocked.toNumber() }
  })
}
