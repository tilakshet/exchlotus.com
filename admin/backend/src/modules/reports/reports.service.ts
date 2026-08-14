import { prisma } from "../../lib/prisma"

export interface DateRange {
  dateFrom: Date
  dateTo: Date
}

function defaultRange(range: Partial<DateRange>): DateRange {
  const dateTo = range.dateTo ?? new Date()
  const dateFrom = range.dateFrom ?? new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { dateFrom, dateTo }
}

interface DayCount {
  day: Date
  count: bigint
}

/**
 * Every figure here is a live, grouped aggregate over real rows — same
 * "no placeholder numbers" discipline as dashboard.service.ts's getSummary,
 * just windowed/grouped across an arbitrary date range instead of a fixed
 * today-vs-yesterday pair. Raw SQL is needed only for date_trunc bucketing,
 * which Prisma's query builder can't express; the tagged-template form
 * (not string concatenation) is what makes $queryRaw parameter-safe here,
 * same as wallets.service.ts's row-lock query.
 */
export async function getUserGrowth(range: Partial<DateRange>) {
  const { dateFrom, dateTo } = defaultRange(range)
  const rows = await prisma.$queryRaw<DayCount[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
    FROM players
    WHERE "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo}
    GROUP BY day
    ORDER BY day ASC
  `
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), newUsers: Number(r.count) }))
}

interface DayTypeSum {
  day: Date
  type: string
  total: string
}

export async function getFinanceTrend(range: Partial<DateRange>) {
  const { dateFrom, dateTo } = defaultRange(range)
  const rows = await prisma.$queryRaw<DayTypeSum[]>`
    SELECT date_trunc('day', "createdAt") AS day, type, SUM(ABS(amount)) AS total
    FROM ledger_entries
    WHERE "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo} AND type IN ('DEPOSIT', 'WITHDRAWAL')
    GROUP BY day, type
    ORDER BY day ASC
  `

  const byDay = new Map<string, { day: string; deposits: number; withdrawals: number }>()
  for (const row of rows) {
    const day = row.day.toISOString().slice(0, 10)
    const entry = byDay.get(day) ?? { day, deposits: 0, withdrawals: 0 }
    if (row.type === "DEPOSIT") entry.deposits = Number(row.total)
    else entry.withdrawals = Number(row.total)
    byDay.set(day, entry)
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

interface DayTypeCountSum {
  day: Date
  type: string
  count: bigint
  total: string
}

/**
 * The multi-day, all-six-types extension of getFinanceTrend (which stays
 * DEPOSIT/WITHDRAWAL-only for its existing chart) — one row per day+type,
 * left as a flat array rather than reshaped here so the frontend table and
 * any per-type chart series can both consume it directly.
 */
export async function getFinanceBreakdown(range: Partial<DateRange>) {
  const { dateFrom, dateTo } = defaultRange(range)
  const rows = await prisma.$queryRaw<DayTypeCountSum[]>`
    SELECT date_trunc('day', "createdAt") AS day, type, COUNT(*) AS count, SUM(ABS(amount)) AS total
    FROM ledger_entries
    WHERE "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo}
    GROUP BY day, type
    ORDER BY day ASC, type ASC
  `
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), type: r.type, count: Number(r.count), total: Number(r.total) }))
}

/**
 * "Active" here can only honestly mean "placed a bet that day" — there's no
 * player session/login-log table (unlike AdminSession for staff) to define
 * activity any other way. Documented, not glossed over, per the "no
 * invented data" discipline this module already follows.
 */
export async function getActiveUsers(range: Partial<DateRange>) {
  const { dateFrom, dateTo } = defaultRange(range)
  const rows = await prisma.$queryRaw<DayCount[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(DISTINCT "playerId") AS count
    FROM ledger_entries
    WHERE "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo} AND type = 'BET'
    GROUP BY day
    ORDER BY day ASC
  `
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), activeUsers: Number(r.count) }))
}

/**
 * Extends dashboard.service.ts's existing finance vocabulary
 * (deposits/withdrawals/wallet balance) into a ranged version, plus
 * platform-wide bet/win volume (same aggregation games.service.ts's
 * getGameStats already does per-game). Deliberately no "net gaming
 * revenue"/GGR field — the platform has no bonus/promo engine
 * (Wallet.bonusBalance is permanently 0) that a real margin figure would
 * need to account for, so any wagered-vs-paid-out delta is labeled
 * literally rather than framed as a P&L number.
 */
export async function getRevenueSummary(range: Partial<DateRange>) {
  const { dateFrom, dateTo } = defaultRange(range)
  const createdAt = { gte: dateFrom, lte: dateTo }

  const [deposits, withdrawals, bets, wins, walletTotals] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { type: "DEPOSIT", createdAt }, _sum: { amount: true }, _count: true }),
    prisma.ledgerEntry.aggregate({ where: { type: "WITHDRAWAL", createdAt }, _sum: { amount: true }, _count: true }),
    prisma.ledgerEntry.aggregate({ where: { type: "BET", createdAt }, _sum: { amount: true }, _count: true }),
    prisma.ledgerEntry.aggregate({ where: { type: "WIN", createdAt }, _sum: { amount: true }, _count: true }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
  ])

  const depositsAmount = deposits._sum.amount?.toNumber() ?? 0
  const withdrawalsAmount = Math.abs(withdrawals._sum.amount?.toNumber() ?? 0)
  const betVolume = Math.abs(bets._sum.amount?.toNumber() ?? 0)
  const winVolume = wins._sum.amount?.toNumber() ?? 0

  return {
    depositsAmount,
    depositsCount: deposits._count,
    withdrawalsAmount,
    withdrawalsCount: withdrawals._count,
    netCashFlow: depositsAmount - withdrawalsAmount,
    betVolume,
    betCount: bets._count,
    winVolume,
    winCount: wins._count,
    /** Literal ledger delta, not a business P&L figure — see doc-comment above. */
    wageredMinusPaidOut: betVolume - winVolume,
    /** Current snapshot, not scoped to the range — a wallet balance has no "as of" range concept. */
    totalWalletBalance: walletTotals._sum.balance?.toNumber() ?? 0,
  }
}

export async function getPopularGames(range: Partial<DateRange>, limit = 10) {
  const { dateFrom, dateTo } = defaultRange(range)
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["gameId"],
    where: { type: "BET", createdAt: { gte: dateFrom, lte: dateTo } },
    _count: true,
    _sum: { amount: true },
    orderBy: { _count: { gameId: "desc" } },
    take: limit,
  })

  // gameId here is the provider's game_id (matches Game.gameId, not
  // Game.id) and isn't an enforced FK — see games.service.ts's identical
  // note. Manual adjustments record gameId "wallet" and won't resolve to a
  // real game; that's expected, not an error.
  const games = await prisma.game.findMany({
    where: { gameId: { in: grouped.map((g) => g.gameId) } },
    select: { gameId: true, gameName: true },
  })
  const nameByGameId = new Map(games.map((g) => [g.gameId, g.gameName]))

  return grouped.map((g) => ({
    gameId: g.gameId,
    gameName: nameByGameId.get(g.gameId) ?? null,
    betCount: g._count,
    betVolume: Math.abs(g._sum.amount?.toNumber() ?? 0),
  }))
}
