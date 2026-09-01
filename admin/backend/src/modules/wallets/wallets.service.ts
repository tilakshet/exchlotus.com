import type { Request } from "express"
import { Prisma, type LedgerEntryType } from "../../generated/prisma"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"

export async function getWalletDetails(playerId: string) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { wallet: true } })
  if (!player?.wallet) throw new AdminApiError("NOT_FOUND", "Player or wallet not found")

  return {
    playerId: player.id,
    username: player.username,
    balance: player.wallet.balance.toNumber(),
    bonusBalance: player.wallet.bonusBalance.toNumber(),
    lockedBalance: player.wallet.lockedBalance.toNumber(),
    currency: player.wallet.currency,
    updatedAt: player.wallet.updatedAt.toISOString(),
  }
}

export async function listLedger(playerId: string, options: { type?: LedgerEntryType[]; limit?: number; cursor?: string } = {}) {
  const limit = Math.min(options.limit ?? 20, 100)
  const rows = await prisma.ledgerEntry.findMany({
    where: { playerId, ...(options.type && options.type.length > 0 ? { type: { in: options.type } } : {}) },
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
      actorAdminId: row.actorAdminId,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

/**
 * The one place admin/backend mutates a wallet — mirrors backend/'s
 * wallet.service.applyLedgerEntry row-locking exactly (FOR UPDATE on the
 * wallet row, then ledger insert + balance update in one transaction)
 * because it targets the same Wallet/LedgerEntry tables; a second,
 * differently-written mutation path against those tables is exactly the
 * kind of parallel financial logic CLAUDE.md prohibits. The audit row is
 * written in the same transaction, so "balance changed but unattributed"
 * is not a reachable state.
 *
 * `idempotencyKey` is caller-supplied (the frontend generates one per
 * confirm-dialog open and reuses it across submit/retry) and used verbatim
 * as the LedgerEntry.transactionId, so a double-submit hits the same
 * [transactionId, type] uniqueness the player-side ledger already relies
 * on for idempotency. The duplicate check happens after the wallet row
 * lock is acquired, so it's race-free against concurrent submissions for
 * the same player.
 */
export async function adjustBalance(
  req: Request,
  playerId: string,
  actorAdminId: string,
  type: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT",
  amount: number,
  reason: string,
  idempotencyKey: string
) {
  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) throw new AdminApiError("NOT_FOUND", "Player not found")

  const signedAmount = type === "WITHDRAWAL" ? -Math.abs(amount) : Math.abs(amount)

  return prisma.$transaction(async (tx) => {
    const walletRows = await tx.$queryRaw<{ id: string; balance: string }[]>`
      SELECT id, balance FROM wallets WHERE "playerId" = ${player.id} FOR UPDATE
    `
    const wallet = walletRows[0]
    if (!wallet) throw new AdminApiError("NOT_FOUND", "Wallet not provisioned for this player")

    const duplicate = await tx.ledgerEntry.findUnique({
      where: { transactionId_type: { transactionId: idempotencyKey, type } },
    })
    if (duplicate) throw new AdminApiError("DUPLICATE_ADJUSTMENT", "This adjustment was already submitted")

    const currentBalance = new Prisma.Decimal(wallet.balance)
    const newBalance = currentBalance.plus(signedAmount)
    if (newBalance.isNegative()) {
      throw new AdminApiError("INSUFFICIENT_BALANCE", "Adjustment would take the wallet negative")
    }

    const entry = await tx.ledgerEntry.create({
      data: {
        playerId: player.id,
        type,
        transactionId: idempotencyKey,
        roundId: "admin-adjustment",
        gameId: "wallet",
        amount: signedAmount,
        balanceAfter: newBalance,
        actorAdminId,
      },
    })
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } })

    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "wallet.adjust",
      entityType: "Player",
      entityId: player.id,
      before: { balance: currentBalance.toNumber() },
      after: { balance: newBalance.toNumber(), type, ledgerEntryId: entry.id },
      reason,
    })

    return { balance: newBalance.toNumber(), ledgerEntryId: entry.id }
  })
}
