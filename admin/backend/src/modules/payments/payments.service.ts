import { prisma } from "../../lib/prisma"
import type { PaymentOrderStatus, Prisma } from "../../generated/prisma"

export interface ListPaymentOrdersOptions {
  status?: PaymentOrderStatus
  /** Matches username, phone, or the gateway's own trx id — same shape as other list endpoints' search. */
  search?: string
  dateFrom?: Date
  dateTo?: Date
  cursor?: string
  limit?: number
}

function buildWhere(options: Omit<ListPaymentOrdersOptions, "cursor" | "limit">): Prisma.PaymentOrderWhereInput {
  return {
    ...(options.status ? { status: options.status } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          createdAt: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lte: options.dateTo } : {}),
          },
        }
      : {}),
    ...(options.search
      ? {
          OR: [
            { gatewayTrxId: { contains: options.search, mode: "insensitive" } },
            { player: { username: { contains: options.search, mode: "insensitive" } } },
            { player: { phone: { contains: options.search } } },
          ],
        }
      : {}),
  }
}

export function countPaymentOrders(options: Omit<ListPaymentOrdersOptions, "cursor" | "limit">) {
  return prisma.paymentOrder.count({ where: buildWhere(options) })
}

/**
 * Deposit ATTEMPTS, not deposit successes — PENDING/FAILED/EXPIRED rows
 * here never became a DEPOSIT LedgerEntry at all (see backend/'s
 * payments.service.ts handlePayinCallback), so this is the only admin view
 * into "a player tried to pay and it didn't go through," which the ledger
 * alone can't show. Previously had zero admin visibility beyond
 * one-row-at-a-time inside a support ticket's `latestPaymentOrder`.
 */
export async function listPaymentOrders(options: ListPaymentOrdersOptions) {
  const limit = Math.min(options.limit ?? 50, 100)
  const where = buildWhere(options)

  const rows = await prisma.paymentOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { id: true, username: true, phone: true, currency: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      player: { id: row.player.id, username: row.player.username, phone: row.player.phone },
      amount: row.amount.toNumber(),
      currency: row.player.currency,
      status: row.status,
      gatewayTrxId: row.gatewayTrxId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}
