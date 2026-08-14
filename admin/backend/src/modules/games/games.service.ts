import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { bumpCatalogVersion } from "../../lib/redis"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import type { Prisma } from "../../generated/prisma"

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 25

export interface ListGamesFilters {
  providerCode?: string
  categoryCode?: string
  search?: string
  enabled?: boolean
  page?: number
  pageSize?: number
}

function buildGamesWhere(filters: Pick<ListGamesFilters, "providerCode" | "categoryCode" | "enabled" | "search">): Prisma.GameWhereInput {
  return {
    ...(filters.providerCode ? { provider: { code: filters.providerCode } } : {}),
    ...(filters.categoryCode ? { category: { code: filters.categoryCode } } : {}),
    ...(filters.enabled !== undefined ? { enabled: filters.enabled } : {}),
    ...(filters.search
      ? {
          OR: [
            { gameName: { contains: filters.search, mode: "insensitive" } },
            { provider: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  }
}

export function countGames(filters: Pick<ListGamesFilters, "providerCode" | "categoryCode" | "enabled" | "search">) {
  return prisma.game.count({ where: buildGamesWhere(filters) })
}

export async function listGames(filters: ListGamesFilters = {}) {
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(Math.floor(filters.pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const where = buildGamesWhere(filters)

  const [total, items] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      include: { provider: true, category: true },
      orderBy: [{ gameName: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }
}

export async function listProviders() {
  return prisma.provider.findMany({ orderBy: { name: "asc" } })
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
}

/**
 * BET/WIN volume for a game — `gameId` here is the provider's own game_id
 * (matches Game.gameId, NOT Game.id), because that's what LedgerEntry.gameId
 * is populated from at settlement time (see backend/src/modules/webhook).
 * It isn't an enforced FK, so a gameId with no matching rows (e.g. "wallet"
 * from an admin manual adjustment) is expected, not an error — it just
 * never reaches this function since it's called with a real Game's gameId.
 */
/** Pure so it's testable without a DB — divide-by-zero returns null, never 0 or NaN, so the UI can render "—". */
export function computeRtpInPractice(betVolume: number, winVolume: number): number | null {
  return betVolume > 0 ? (winVolume / betVolume) * 100 : null
}

export async function getGameStats(gameId: string) {
  const [betAgg, winAgg] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { gameId, type: "BET" }, _sum: { amount: true }, _count: true }),
    prisma.ledgerEntry.aggregate({ where: { gameId, type: "WIN" }, _sum: { amount: true }, _count: true }),
  ])

  const betVolume = Math.abs(betAgg._sum.amount?.toNumber() ?? 0)
  const winVolume = winAgg._sum.amount?.toNumber() ?? 0

  return {
    betCount: betAgg._count,
    betVolume,
    winCount: winAgg._count,
    winVolume,
    rtpInPractice: computeRtpInPractice(betVolume, winVolume),
  }
}

export async function getGameDetail(id: string) {
  const game = await prisma.game.findUnique({ where: { id }, include: { provider: true, category: true } })
  if (!game) throw new AdminApiError("NOT_FOUND", "Game not found")
  return { ...game, stats: await getGameStats(game.gameId) }
}

/**
 * Update + audit row in one transaction (canonical pattern, see
 * wallets.service.ts adjustBalance) — bumpCatalogVersion runs AFTER commit
 * so a rolled-back change never invalidates the player-facing cache for a
 * write that didn't actually happen.
 */
export async function setGameEnabled(req: Request, actorAdminId: string, id: string, enabled: boolean, reason: string) {
  const game = await prisma.game.findUnique({ where: { id } })
  if (!game) throw new AdminApiError("NOT_FOUND", "Game not found")
  if (game.enabled === enabled) return game

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.game.update({ where: { id }, data: { enabled } })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: enabled ? "game.enable" : "game.disable",
      entityType: "Game",
      entityId: id,
      before: { enabled: game.enabled },
      after: { enabled },
      reason,
    })
    return result
  })

  await bumpCatalogVersion()
  return updated
}
