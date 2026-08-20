import { prisma } from "../../lib/prisma"
import type { Prisma } from "../../generated/prisma"

export interface ListLoginEventsOptions {
  playerId?: string
  phone?: string
  result?: "SUCCESS" | "FAILURE"
  method?: "PASSWORD" | "OTP" | "REGISTER"
  cursor?: string
  limit?: number
}

export async function listLoginEvents(options: ListLoginEventsOptions) {
  const limit = Math.min(options.limit ?? 50, 200)

  const where: Prisma.LoginEventWhereInput = {
    ...(options.playerId ? { playerId: options.playerId } : {}),
    ...(options.phone ? { phone: { contains: options.phone } } : {}),
    ...(options.result ? { result: options.result } : {}),
    ...(options.method ? { method: options.method } : {}),
  }

  const rows = await prisma.loginEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { username: true, externalId: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      playerId: row.playerId,
      playerUsername: row.player?.username ?? null,
      phone: row.phone,
      method: row.method,
      result: row.result,
      reason: row.reason,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}
