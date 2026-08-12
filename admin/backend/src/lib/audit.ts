import type { Request } from "express"
import type { Prisma } from "../generated/prisma"
import { prisma } from "./prisma"

export interface AuditEntry {
  adminId: string
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  reason?: string
}

/**
 * Writes one AdminAuditLog row. Callers pass either the top-level `prisma`
 * client or a `tx` from within a `prisma.$transaction(...)` — every mutating
 * handler in this codebase writes its audit row in the SAME transaction as
 * the business change it describes, so a crash between "change applied" and
 * "audit written" is impossible (see wallets.service.ts adjustBalance for
 * the canonical example).
 */
export function writeAuditLog(
  client: Prisma.TransactionClient | typeof prisma,
  req: Request,
  entry: AuditEntry
) {
  return client.adminAuditLog.create({
    data: {
      adminId: entry.adminId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
      reason: entry.reason,
      ipAddress: req.ip ?? "unknown",
      requestId: req.requestId,
    },
  })
}
