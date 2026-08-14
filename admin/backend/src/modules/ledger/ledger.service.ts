import { prisma } from "../../lib/prisma"
import type { LedgerEntryType, Prisma } from "../../generated/prisma"

export interface ListGlobalLedgerOptions {
  type?: LedgerEntryType[]
  playerId?: string
  /** Matches the player's username or externalId — same shape as users.service.ts listUsers' search. */
  search?: string
  gameId?: string
  roundId?: string
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
  cursor?: string
  limit?: number
}

/** Shared by listGlobalLedger and countGlobalLedger (the export handler's pre-flight row-count check) so the two never drift on what "matching the current filters" means. */
function buildLedgerWhere(options: ListGlobalLedgerOptions): Prisma.LedgerEntryWhereInput {
  return {
    ...(options.type && options.type.length > 0 ? { type: { in: options.type } } : {}),
    ...(options.playerId ? { playerId: options.playerId } : {}),
    ...(options.search
      ? {
          player: {
            OR: [
              { username: { contains: options.search, mode: "insensitive" } },
              { externalId: { contains: options.search } },
            ],
          },
        }
      : {}),
    ...(options.gameId ? { gameId: options.gameId } : {}),
    ...(options.roundId ? { roundId: options.roundId } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          createdAt: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lte: options.dateTo } : {}),
          },
        }
      : {}),
    ...(options.minAmount !== undefined || options.maxAmount !== undefined
      ? {
          amount: {
            ...(options.minAmount !== undefined ? { gte: options.minAmount } : {}),
            ...(options.maxAmount !== undefined ? { lte: options.maxAmount } : {}),
          },
        }
      : {}),
  }
}

export function countGlobalLedger(options: Omit<ListGlobalLedgerOptions, "cursor" | "limit">) {
  return prisma.ledgerEntry.count({ where: buildLedgerWhere(options) })
}

/**
 * The one query backing deposits/withdrawals/transactions (item 2) and
 * bets/game-activity (item 4) — same LedgerEntry table, same `ledger.view`
 * permission boundary, different `type` filter and columns emphasized by
 * the caller. See admin/backend README-equivalent doc-comment on
 * wallets.service.ts listLedger for the cursor-pagination pattern this
 * mirrors, generalized here to not be scoped to one player.
 */
export async function listGlobalLedger(options: ListGlobalLedgerOptions) {
  const limit = Math.min(options.limit ?? 25, 100)
  const where = buildLedgerWhere(options)

  const rows = await prisma.ledgerEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { username: true, externalId: true, currency: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount.toNumber(),
      balanceAfter: row.balanceAfter.toNumber(),
      transactionId: row.transactionId,
      roundId: row.roundId,
      gameId: row.gameId,
      sessionId: row.sessionId,
      actorAdminId: row.actorAdminId,
      createdAt: row.createdAt.toISOString(),
      player: { id: row.playerId, username: row.player.username, externalId: row.player.externalId, currency: row.player.currency },
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}
