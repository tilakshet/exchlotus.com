import { prisma } from "../../lib/prisma"

function percentChange(today: number, yesterday: number): number {
  if (yesterday === 0) return today === 0 ? 0 : 100
  return ((today - yesterday) / yesterday) * 100
}

/**
 * Every figure here is a live query against the platform's real tables —
 * no placeholder/fake numbers (master spec §52). Sections that need data
 * this schema doesn't have yet (system health, fraud, KYC queues — see the
 * architecture report's Tier 2/3 split) are simply not included here rather
 * than faked. Day-over-day trend and "action required" are both computed
 * from real rows too — trend from yesterday's own aggregates, and the one
 * action-required signal Tier 1's data actually supports: admins who
 * haven't enrolled MFA yet.
 */
export async function getSummary() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  const [
    totalUsers,
    newUsersToday,
    activeUsers,
    suspendedUsers,
    depositsToday,
    depositsYesterday,
    withdrawalsToday,
    withdrawalsYesterday,
    walletTotals,
    ledgerEntriesToday,
    adminCount,
    adminsWithoutMfa,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.player.count({ where: { status: "ACTIVE" } }),
    prisma.player.count({ where: { status: "SUSPENDED" } }),
    prisma.ledgerEntry.aggregate({
      where: { type: "DEPOSIT", createdAt: { gte: startOfToday } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: "DEPOSIT", createdAt: { gte: startOfYesterday, lt: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: "WITHDRAWAL", createdAt: { gte: startOfToday } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: "WITHDRAWAL", createdAt: { gte: startOfYesterday, lt: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.ledgerEntry.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.adminUser.count({ where: { status: "ACTIVE" } }),
    prisma.adminUser.count({ where: { status: "ACTIVE", mfaEnabled: false } }),
  ])

  const depositsTodayAmount = depositsToday._sum.amount?.toNumber() ?? 0
  const depositsYesterdayAmount = depositsYesterday._sum.amount?.toNumber() ?? 0
  const withdrawalsTodayAmount = Math.abs(withdrawalsToday._sum.amount?.toNumber() ?? 0)
  const withdrawalsYesterdayAmount = Math.abs(withdrawalsYesterday._sum.amount?.toNumber() ?? 0)

  return {
    users: {
      total: totalUsers,
      newToday: newUsersToday,
      active: activeUsers,
      suspended: suspendedUsers,
    },
    finance: {
      depositsTodayAmount,
      depositsTodayCount: depositsToday._count,
      depositsChangePct: percentChange(depositsTodayAmount, depositsYesterdayAmount),
      withdrawalsTodayAmount,
      withdrawalsTodayCount: withdrawalsToday._count,
      withdrawalsChangePct: percentChange(withdrawalsTodayAmount, withdrawalsYesterdayAmount),
      totalWalletBalance: walletTotals._sum.balance?.toNumber() ?? 0,
    },
    activity: {
      ledgerEntriesToday,
    },
    admins: {
      activeCount: adminCount,
      withoutMfaCount: adminsWithoutMfa,
    },
    generatedAt: new Date().toISOString(),
  }
}
