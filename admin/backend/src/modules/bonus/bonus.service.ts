import type { Request } from "express"
import { Prisma, type BonusTransactionType } from "../../generated/prisma"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"

export async function getBonusWallet(playerId: string) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { wallet: true } })
  if (!player?.wallet) throw new AdminApiError("NOT_FOUND", "Player or wallet not found")

  return {
    playerId: player.id,
    username: player.username,
    coinBalance: player.wallet.bonusCoinBalance,
    bonusBalance: player.wallet.bonusBalance.toNumber(),
    playableBonusBalance: player.wallet.bonusPlayableBalance.toNumber(),
    updatedAt: player.wallet.updatedAt.toISOString(),
  }
}

export async function listBonusTransactions(playerId: string, options: { limit?: number; cursor?: string } = {}) {
  const limit = Math.min(options.limit ?? 20, 100)
  const rows = await prisma.bonusTransaction.findMany({
    where: { playerId },
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
      currency: row.currency,
      balanceBefore: row.balanceBefore?.toNumber() ?? null,
      balanceAfter: row.balanceAfter?.toNumber() ?? null,
      status: row.status,
      description: row.description,
      referralId: row.referralId,
      relatedDepositId: row.relatedDepositId,
      actorAdminId: row.actorAdminId,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

/**
 * The one place admin/backend mutates bonusCoinBalance directly (as opposed
 * to backend/'s automatic welcome/join/first-deposit/conversion events) —
 * mirrors wallets.service.ts adjustBalance exactly: FOR UPDATE row lock,
 * idempotency via a caller-supplied key reused verbatim as
 * BonusTransaction.reference, and the audit row written in the same
 * transaction so "coin balance changed but unattributed" is not a reachable
 * state. `coins` is signed: positive to grant, negative to claw back.
 */
export async function adjustBonusCoins(
  req: Request,
  playerId: string,
  actorAdminId: string,
  coins: number,
  reason: string,
  idempotencyKey: string
) {
  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) throw new AdminApiError("NOT_FOUND", "Player not found")

  const reference = `bonus:admin:${playerId}:${idempotencyKey}`
  const type: BonusTransactionType = "BONUS_ADJUSTMENT"

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.bonusTransaction.findUnique({ where: { reference } })
    if (duplicate) throw new AdminApiError("DUPLICATE_ADJUSTMENT", "This adjustment was already submitted")

    const walletRows = await tx.$queryRaw<{ id: string; bonusCoinBalance: number }[]>`
      SELECT id, "bonusCoinBalance" FROM wallets WHERE "playerId" = ${playerId} FOR UPDATE
    `
    const wallet = walletRows[0]
    if (!wallet) throw new AdminApiError("NOT_FOUND", "Wallet not provisioned for this player")

    const before = wallet.bonusCoinBalance
    const after = before + coins
    if (after < 0) {
      throw new AdminApiError("INSUFFICIENT_BALANCE", "Adjustment would take the bonus coin balance negative")
    }

    await tx.wallet.update({ where: { id: wallet.id }, data: { bonusCoinBalance: after } })
    const entry = await tx.bonusTransaction.create({
      data: {
        playerId,
        type,
        amount: new Prisma.Decimal(coins),
        currency: "COIN",
        balanceBefore: new Prisma.Decimal(before),
        balanceAfter: new Prisma.Decimal(after),
        reference,
        description: reason,
        actorAdminId,
      },
    })

    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "bonus.adjust",
      entityType: "Player",
      entityId: playerId,
      before: { coinBalance: before },
      after: { coinBalance: after, coins, bonusTransactionId: entry.id },
      reason,
    })

    return { coinBalance: after, bonusTransactionId: entry.id }
  })
}
