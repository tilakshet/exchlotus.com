import { prisma } from "../../lib/prisma"
import type { Prisma } from "../../generated/prisma"

export interface ListAuditLogOptions {
  adminId?: string
  entityType?: string
  entityId?: string
  action?: string
  dateFrom?: Date
  dateTo?: Date
  cursor?: string
  limit?: number
}

export async function listAuditLogs(options: ListAuditLogOptions) {
  const limit = Math.min(options.limit ?? 50, 200)

  const where: Prisma.AdminAuditLogWhereInput = {
    ...(options.adminId ? { adminId: options.adminId } : {}),
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.entityId ? { entityId: options.entityId } : {}),
    ...(options.action ? { action: { contains: options.action, mode: "insensitive" } } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          createdAt: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lte: options.dateTo } : {}),
          },
        }
      : {}),
  }

  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { admin: { select: { email: true, firstName: true, lastName: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      adminId: row.adminId,
      adminEmail: row.admin.email,
      adminName: `${row.admin.firstName} ${row.admin.lastName}`,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      before: row.before,
      after: row.after,
      reason: row.reason,
      ipAddress: row.ipAddress,
      requestId: row.requestId,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}
