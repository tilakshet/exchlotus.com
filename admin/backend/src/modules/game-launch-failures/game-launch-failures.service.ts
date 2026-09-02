import { prisma } from "../../lib/prisma"
import type { Prisma } from "../../generated/prisma"

export interface ListLaunchFailuresOptions {
  /** Matches game ID or player username/phone. */
  search?: string
  dateFrom?: Date
  dateTo?: Date
  cursor?: string
  limit?: number
}

function buildWhere(options: Omit<ListLaunchFailuresOptions, "cursor" | "limit">): Prisma.GameLaunchFailureWhereInput {
  return {
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
            { gameId: { contains: options.search, mode: "insensitive" } },
            { player: { username: { contains: options.search, mode: "insensitive" } } },
            { player: { phone: { contains: options.search } } },
          ],
        }
      : {}),
  }
}

export function countLaunchFailures(options: Omit<ListLaunchFailuresOptions, "cursor" | "limit">) {
  return prisma.gameLaunchFailure.count({ where: buildWhere(options) })
}

/**
 * The only admin-facing record of "a player tried to launch a game and it
 * didn't work" — previously that only ever reached a stdout log line
 * (game-session.controller.ts's logger.error calls), invisible to anyone
 * not tailing production logs at the exact moment it happened.
 */
export async function listLaunchFailures(options: ListLaunchFailuresOptions) {
  const limit = Math.min(options.limit ?? 50, 100)
  const where = buildWhere(options)

  const rows = await prisma.gameLaunchFailure.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { id: true, username: true, phone: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      player: { id: row.player.id, username: row.player.username, phone: row.player.phone },
      gameId: row.gameId,
      mode: row.mode,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

export interface LaunchFailureSummaryRow {
  gameId: string
  count: number
}

/** Which games are actually failing to launch most often — the direct answer to "why aren't some games starting." */
export async function getTopFailingGames(since: Date, limit = 10): Promise<LaunchFailureSummaryRow[]> {
  const rows = await prisma.gameLaunchFailure.groupBy({
    by: ["gameId"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { gameId: "desc" } },
    take: limit,
  })
  return rows.map((r) => ({ gameId: r.gameId, count: r._count._all }))
}
