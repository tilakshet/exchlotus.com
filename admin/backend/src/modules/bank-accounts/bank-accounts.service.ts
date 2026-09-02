import { prisma } from "../../lib/prisma"
import type { Prisma } from "../../generated/prisma"

export interface ListBankAccountsOptions {
  /** Matches player username/phone, account holder name, account number, or bank name. */
  search?: string
  cursor?: string
  limit?: number
}

function buildWhere(options: Pick<ListBankAccountsOptions, "search">): Prisma.BankAccountWhereInput {
  return {
    ...(options.search
      ? {
          OR: [
            { accountHolderName: { contains: options.search, mode: "insensitive" } },
            { bankName: { contains: options.search, mode: "insensitive" } },
            { accountNumber: { contains: options.search } },
            { ifsc: { contains: options.search, mode: "insensitive" } },
            { player: { username: { contains: options.search, mode: "insensitive" } } },
            { player: { phone: { contains: options.search } } },
          ],
        }
      : {}),
  }
}

export function countBankAccounts(options: Pick<ListBankAccountsOptions, "search">) {
  return prisma.bankAccount.count({ where: buildWhere(options) })
}

/**
 * Previously only ever visible embedded one-at-a-time inside a withdrawal
 * row — no way to search "does this player have a saved account" or spot
 * the same bank account reused across multiple player accounts (a real
 * payout-fraud signal: one physical bank account collecting withdrawals
 * for several "different" players). accountsPerNumber below surfaces
 * exactly that without requiring a separate fraud-detection feature.
 */
export async function listBankAccounts(options: ListBankAccountsOptions) {
  const limit = Math.min(options.limit ?? 50, 100)
  const where = buildWhere(options)

  const rows = await prisma.bankAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { id: true, username: true, phone: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const accountNumbers = page.map((r) => r.accountNumber)
  const dupCounts =
    accountNumbers.length > 0
      ? await prisma.bankAccount.groupBy({ by: ["accountNumber"], where: { accountNumber: { in: accountNumbers } }, _count: { _all: true } })
      : []
  const countByNumber = new Map(dupCounts.map((d) => [d.accountNumber, d._count._all]))

  return {
    items: page.map((row) => ({
      id: row.id,
      player: { id: row.player.id, username: row.player.username, phone: row.player.phone },
      accountHolderName: row.accountHolderName,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      ifsc: row.ifsc,
      createdAt: row.createdAt.toISOString(),
      /** >1 means this exact account number is saved against more than one player — a payout-fraud signal, not necessarily proof of one. */
      sharedWithOtherPlayers: (countByNumber.get(row.accountNumber) ?? 1) > 1,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}
