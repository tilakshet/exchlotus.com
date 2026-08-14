import { Router } from "express"
import { z } from "zod"
import { requireAdminAuth } from "../auth/admin-auth.middleware"
import { requirePermission } from "../rbac/rbac.middleware"
import { writeAuditLog } from "../../lib/audit"
import { prisma } from "../../lib/prisma"
import { csvRow } from "../../lib/csv"
import { streamReportPdf } from "../../lib/pdf-report"
import {
  getActiveUsers,
  getFinanceBreakdown,
  getFinanceTrend,
  getPopularGames,
  getRevenueSummary,
  getUserGrowth,
  type DateRange,
} from "./reports.service"

export const reportsRouter = Router()
reportsRouter.use(requireAdminAuth)
reportsRouter.use(requirePermission("reports.view"))

const rangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

reportsRouter.get("/user-growth", async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getUserGrowth(parsed.data))
})

reportsRouter.get("/finance-trend", async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getFinanceTrend(parsed.data))
})

const popularGamesSchema = rangeSchema.extend({ limit: z.coerce.number().int().positive().max(50).optional() })

reportsRouter.get("/popular-games", async (req, res) => {
  const parsed = popularGamesSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getPopularGames(parsed.data, parsed.data.limit))
})

reportsRouter.get("/finance-breakdown", async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getFinanceBreakdown(parsed.data))
})

reportsRouter.get("/active-users", async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getActiveUsers(parsed.data))
})

reportsRouter.get("/revenue-summary", async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  res.json(await getRevenueSummary(parsed.data))
})

function resolveRange(input: { dateFrom?: Date; dateTo?: Date }): DateRange {
  const dateTo = input.dateTo ?? new Date()
  const dateFrom = input.dateFrom ?? new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { dateFrom, dateTo }
}

const exportSchema = rangeSchema.extend({ format: z.enum(["csv", "pdf"]) })

/**
 * Report data volumes are day-bucketed aggregates (at most a few hundred
 * rows even over a year), unlike ledger/users/games' per-record exports —
 * no MAX_EXPORT_ROWS cap or cursor streaming needed here, but still gated,
 * audited, and requires reports.export like the other three.
 */
reportsRouter.get("/export", requirePermission("reports.export"), async (req, res) => {
  const parsed = exportSchema.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  const range = resolveRange(parsed.data)

  const [revenue, breakdown, popularGames] = await Promise.all([
    getRevenueSummary(range),
    getFinanceBreakdown(range),
    getPopularGames(range, 10),
  ])

  await writeAuditLog(prisma, req, {
    adminId: req.adminAuth!.id,
    action: "reports.export",
    entityType: "Report",
    entityId: "bulk",
    after: { filters: range, format: parsed.data.format },
  })

  if (parsed.data.format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="report-${range.dateFrom.toISOString().slice(0, 10)}-to-${range.dateTo.toISOString().slice(0, 10)}.csv"`)
    res.write("﻿")
    res.write(csvRow(["Date", "Type", "Count", "Amount"]))
    for (const row of breakdown) res.write(csvRow([row.day, row.type, row.count, row.total]))
    res.end()
    return
  }

  streamReportPdf(res, `report-${range.dateFrom.toISOString().slice(0, 10)}-to-${range.dateTo.toISOString().slice(0, 10)}.pdf`, {
    title: "Financial Report",
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    kpis: [
      { label: "Total Deposits", value: revenue.depositsAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
      { label: "Total Withdrawals", value: revenue.withdrawalsAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
      { label: "Net Cash Flow", value: revenue.netCashFlow.toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
      { label: "Wagered", value: revenue.betVolume.toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
      { label: "Paid Out", value: revenue.winVolume.toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
      { label: "Total Wallet Balance", value: revenue.totalWalletBalance.toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
    ],
    sections: [
      {
        heading: "Popular Games",
        rows: [
          ["Game", "Bets", "Volume"],
          ...popularGames.map((g) => [g.gameName ?? g.gameId, String(g.betCount), g.betVolume.toLocaleString("en-IN", { style: "currency", currency: "INR" })]),
        ],
      },
      {
        heading: "Ledger Breakdown",
        rows: [["Date", "Type", "Count", "Amount"], ...breakdown.map((r) => [r.day, r.type, String(r.count), r.total.toLocaleString("en-IN", { style: "currency", currency: "INR" })])],
      },
    ],
  })
})
