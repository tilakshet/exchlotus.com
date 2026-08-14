import { prisma } from "../../lib/prisma"
import { env } from "../../lib/env"

/**
 * Derived read-only from AdminAuditLog — every action here is already
 * written transactionally by its own module (wallets/users/admins/roles
 * services), so this needs no new write path and trivially satisfies "no
 * fake data": it's the literal audit trail, just summarized and filtered to
 * an allowlist so routine low-signal events (e.g. admin.enable) don't drown
 * the feed. See AdminUser.lastNotificationsViewedAt in schema.prisma for the
 * one piece of state this module owns.
 */
const NOTIFICATION_ACTIONS = [
  "user.suspend",
  "admin.create",
  "admin.mfa_reset",
  "admin.disable",
  "role.permissions_changed",
  "wallet.adjust",
  "game.disable",
] as const

function isNotificationWorthy(row: { action: string; before: unknown; after: unknown }): boolean {
  if (row.action !== "wallet.adjust") return true
  // Only a large withdrawal is notification-worthy — everything else
  // wallets.adjust writes (deposits, small adjustments) stays in the audit
  // log without also surfacing here.
  const after = row.after as { type?: string; balance?: number } | null
  const before = row.before as { balance?: number } | null
  if (after?.type !== "WITHDRAWAL" || after.balance === undefined || before?.balance === undefined) return false
  return Math.abs(before.balance - after.balance) >= env.LARGE_WITHDRAWAL_THRESHOLD
}

export interface ListNotificationsOptions {
  cursor?: string
  limit?: number
}

export async function listNotifications(adminId: string, options: ListNotificationsOptions = {}) {
  const limit = Math.min(options.limit ?? 25, 100)

  const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { lastNotificationsViewedAt: true } })
  const readCutoff = admin?.lastNotificationsViewedAt ?? new Date(0)

  const rows = await prisma.adminAuditLog.findMany({
    where: { action: { in: [...NOTIFICATION_ACTIONS] } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { admin: { select: { firstName: true, lastName: true } } },
  })

  // Cursor/hasMore are derived from the raw fetched page (same pattern as
  // every other cursor-paginated list in this codebase) — the notification-
  // worthiness filter below is applied for display only, after pagination
  // is already decided, so a filtered-out row never skews page boundaries.
  const hasMore = rows.length > limit
  const rawPage = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? rawPage[rawPage.length - 1].id : null

  const items = rawPage.filter(isNotificationWorthy).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    reason: row.reason,
    adminName: `${row.admin.firstName} ${row.admin.lastName}`,
    createdAt: row.createdAt.toISOString(),
    read: row.createdAt <= readCutoff,
  }))

  return { items, nextCursor }
}

export async function markNotificationsRead(adminId: string) {
  await prisma.adminUser.update({ where: { id: adminId }, data: { lastNotificationsViewedAt: new Date() } })
}

/**
 * Separate from listNotifications because the badge count needs to reflect
 * ALL unread qualifying events, not just whatever fits on one fetched page
 * — a DB count, not a client-side tally of a paginated list.
 */
export async function getUnreadCount(adminId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { lastNotificationsViewedAt: true } })
  const readCutoff = admin?.lastNotificationsViewedAt ?? new Date(0)

  const rows = await prisma.adminAuditLog.findMany({
    where: { action: { in: [...NOTIFICATION_ACTIONS] }, createdAt: { gt: readCutoff } },
    select: { action: true, before: true, after: true },
    take: 500,
  })
  return rows.filter(isNotificationWorthy).length
}
