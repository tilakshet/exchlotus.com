import { prisma } from "../../lib/prisma"
import { env } from "../../lib/env"

/**
 * Two source streams merged into one feed, both gated by the same
 * AdminUser.lastNotificationsViewedAt cutoff (see markNotificationsRead) —
 * one read-state field covers both, no separate "read" tracking needed per
 * source:
 *
 *  - "audit": derived read-only from AdminAuditLog — every action here is
 *    already written transactionally by its own module (wallets/users/
 *    admins/roles services), filtered to an allowlist so routine low-signal
 *    events (e.g. admin.enable) don't drown the feed.
 *  - "ticket": a player raising a new ticket or replying to one — these
 *    never hit AdminAuditLog (that table is admin-actions-only, written by
 *    writeAuditLog; a player's SupportMessage is written by the entirely
 *    separate backend/ process). Read straight from SupportMessage instead
 *    — a brand-new ticket is just its first message, so one query covers
 *    both "new ticket" and "player replied" without distinguishing them.
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

interface AuditNotificationItem {
  id: string
  kind: "audit"
  action: string
  entityType: string
  entityId: string
  reason: string | null
  adminName: string
  createdAt: string
  read: boolean
}

interface TicketNotificationItem {
  id: string
  kind: "ticket"
  ticketId: string
  subject: string
  playerUsername: string
  preview: string
  createdAt: string
  read: boolean
}

type NotificationItem = AuditNotificationItem | TicketNotificationItem

export interface ListNotificationsOptions {
  /** ISO timestamp — items strictly older than this are returned. A plain offset would work too at this volume, but a timestamp cursor stays correct if new rows land in either source between page fetches. */
  cursor?: string
  limit?: number
}

async function fetchAuditItems(before: Date | undefined, take: number, readCutoff: Date): Promise<AuditNotificationItem[]> {
  const rows = await prisma.adminAuditLog.findMany({
    where: { action: { in: [...NOTIFICATION_ACTIONS] }, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: { admin: { select: { firstName: true, lastName: true } } },
  })
  return rows.filter(isNotificationWorthy).map((row) => ({
    id: row.id,
    kind: "audit" as const,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    reason: row.reason,
    adminName: `${row.admin.firstName} ${row.admin.lastName}`,
    createdAt: row.createdAt.toISOString(),
    read: row.createdAt <= readCutoff,
  }))
}

async function fetchTicketItems(before: Date | undefined, take: number, readCutoff: Date): Promise<TicketNotificationItem[]> {
  const rows = await prisma.supportMessage.findMany({
    where: { authorPlayerId: { not: null }, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: { ticket: { select: { id: true, subject: true, player: { select: { username: true } } } } },
  })
  return rows.map((row) => ({
    id: row.id,
    kind: "ticket" as const,
    ticketId: row.ticket.id,
    subject: row.ticket.subject,
    playerUsername: row.ticket.player.username,
    preview: row.body.length > 120 ? `${row.body.slice(0, 120)}…` : row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.createdAt <= readCutoff,
  }))
}

export async function listNotifications(adminId: string, options: ListNotificationsOptions = {}): Promise<{ items: NotificationItem[]; nextCursor: string | null }> {
  const limit = Math.min(options.limit ?? 25, 100)
  const before = options.cursor ? new Date(options.cursor) : undefined

  const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { lastNotificationsViewedAt: true } })
  const readCutoff = admin?.lastNotificationsViewedAt ?? new Date(0)

  // Fetch `limit` from each source (upper bound on how many of one source
  // could occupy a merged page of `limit`), merge, sort, slice.
  const [auditItems, ticketItems] = await Promise.all([fetchAuditItems(before, limit, readCutoff), fetchTicketItems(before, limit, readCutoff)])

  const merged = [...auditItems, ...ticketItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const hasMore = merged.length > limit
  const items = hasMore ? merged.slice(0, limit) : merged
  const nextCursor = hasMore ? items[items.length - 1].createdAt : null

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

  const [auditRows, ticketCount] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: { action: { in: [...NOTIFICATION_ACTIONS] }, createdAt: { gt: readCutoff } },
      select: { action: true, before: true, after: true },
      take: 500,
    }),
    prisma.supportMessage.count({ where: { authorPlayerId: { not: null }, createdAt: { gt: readCutoff } } }),
  ])
  return auditRows.filter(isNotificationWorthy).length + ticketCount
}
