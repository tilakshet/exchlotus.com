import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import type { Prisma } from "../../generated/prisma"

export interface ListUsersOptions {
  search?: string
  status?: "ACTIVE" | "SUSPENDED"
  cursor?: string
  limit?: number
}

function buildUsersWhere(options: Pick<ListUsersOptions, "search" | "status">): Prisma.PlayerWhereInput {
  return {
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          OR: [
            { username: { contains: options.search, mode: "insensitive" } },
            { email: { contains: options.search, mode: "insensitive" } },
            { phone: { contains: options.search } },
            { externalId: { contains: options.search } },
          ],
        }
      : {}),
  }
}

export function countUsers(options: Pick<ListUsersOptions, "search" | "status">) {
  return prisma.player.count({ where: buildUsersWhere(options) })
}

export async function listUsers(options: ListUsersOptions) {
  const limit = Math.min(options.limit ?? 25, 100)
  const where = buildUsersWhere(options)

  const rows = await prisma.player.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { wallet: true },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      username: p.username,
      email: p.email,
      phone: p.phone,
      status: p.status,
      balance: p.wallet?.balance.toNumber() ?? null,
      currency: p.currency,
      createdAt: p.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

export async function getUserDetail(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    include: { wallet: true, entries: { orderBy: { createdAt: "desc" }, take: 20 } },
  })
  if (!player) throw new AdminApiError("NOT_FOUND", "Player not found")

  return {
    id: player.id,
    externalId: player.externalId,
    username: player.username,
    email: player.email,
    phone: player.phone,
    firstName: player.firstName,
    lastName: player.lastName,
    currency: player.currency,
    status: player.status,
    createdAt: player.createdAt.toISOString(),
    wallet: player.wallet
      ? {
          balance: player.wallet.balance.toNumber(),
          bonusBalance: player.wallet.bonusBalance.toNumber(),
          lockedBalance: player.wallet.lockedBalance.toNumber(),
          currency: player.wallet.currency,
        }
      : null,
    recentLedger: player.entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount.toNumber(),
      balanceAfter: e.balanceAfter.toNumber(),
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

export async function setUserStatus(
  req: Request,
  id: string,
  actorAdminId: string,
  status: "ACTIVE" | "SUSPENDED",
  reason: string
) {
  const player = await prisma.player.findUnique({ where: { id } })
  if (!player) throw new AdminApiError("NOT_FOUND", "Player not found")
  if (player.status === status) return player

  return prisma.$transaction(async (tx) => {
    const updated = await tx.player.update({ where: { id }, data: { status } })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: status === "SUSPENDED" ? "user.suspend" : "user.activate",
      entityType: "Player",
      entityId: id,
      before: { status: player.status },
      after: { status },
      reason,
    })
    return updated
  })
}
