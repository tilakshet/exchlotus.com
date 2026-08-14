import type { Request, Response } from "express"
import { streamCsv } from "./csv"
import { writeAuditLog } from "./audit"
import { prisma } from "./prisma"

/**
 * No queue system exists in this codebase (confirmed, none added here) —
 * so the honest answer for "what if the filtered export is huge" is a hard
 * cap with a clear message to narrow the filters, backed by cursor
 * streaming below the cap to keep memory bounded to one page at a time.
 */
export const MAX_EXPORT_ROWS = 100_000

/**
 * Shared by every bulk-record CSV export (ledger/users/games): count the
 * exact filtered query first, 422 if it's over the cap, otherwise write one
 * audit row and stream the CSV. Centralized so all four export endpoints
 * apply the same cap/audit rules rather than each re-implementing them.
 */
export async function runCsvExport<T>(
  req: Request,
  res: Response,
  opts: {
    actorAdminId: string
    module: string
    filename: string
    header: string[]
    countRows: () => Promise<number>
    fetchPage: (cursor: string | undefined, pageSize: number) => Promise<{ items: T[]; nextCursor: string | null }>
    toRow: (item: T) => (string | number | boolean | null | undefined)[]
    filtersForAudit: unknown
  }
): Promise<void> {
  const total = await opts.countRows()
  if (total > MAX_EXPORT_ROWS) {
    res.status(422).json({
      error: "EXPORT_TOO_LARGE",
      message: `This export would include ${total.toLocaleString()} rows, over the ${MAX_EXPORT_ROWS.toLocaleString()}-row limit — narrow the date range or filters and try again.`,
    })
    return
  }

  // Read-only action, top-level `prisma` (not inside a transaction with the
  // read) — there's nothing to roll back together with a query.
  await writeAuditLog(prisma, req, {
    adminId: opts.actorAdminId,
    action: `${opts.module}.export`,
    entityType: opts.module,
    entityId: "bulk",
    after: { filters: opts.filtersForAudit, format: "csv", rowCount: total },
  })

  await streamCsv(res, opts.filename, opts.header, opts.fetchPage, opts.toRow)
}
