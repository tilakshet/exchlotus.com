import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import { publishPlayerNotification } from "../../lib/redis"
import type { Prisma, SupportTicketStatus } from "../../generated/prisma"

export interface ListTicketsOptions {
  status?: SupportTicketStatus
  search?: string
  /** Tickets no admin has replied to yet (assignedAdminId is set on first reply — see replyToTicket below). */
  unassigned?: boolean
  dateFrom?: Date
  dateTo?: Date
  cursor?: string
  limit?: number
}

export async function listTickets(options: ListTicketsOptions) {
  const limit = Math.min(options.limit ?? 25, 100)

  const where: Prisma.SupportTicketWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.unassigned ? { assignedAdminId: null } : {}),
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
            { subject: { contains: options.search, mode: "insensitive" } },
            { player: { username: { contains: options.search, mode: "insensitive" } } },
            { player: { externalId: { contains: options.search } } },
          ],
        }
      : {}),
  }

  const rows = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { player: { select: { username: true, externalId: true } }, _count: { select: { messages: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      player: { id: t.playerId, username: t.player.username, externalId: t.player.externalId },
      messageCount: t._count.messages,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

/**
 * Everything an admin needs to actually handle the conversation without
 * leaving the page: the thread, who the player is, and — since a support
 * query is so often "where's my money" — their most recent wallet/payment
 * activity. Read-only joins only; no new payment-side endpoints.
 */
export async function getTicketDetail(id: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      player: { select: { id: true, username: true, externalId: true, status: true, wallet: { select: { balance: true, currency: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!ticket) throw new AdminApiError("NOT_FOUND", "Ticket not found")

  const [recentLedger, latestWithdrawal, latestPaymentOrder] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { playerId: ticket.playerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, amount: true, createdAt: true },
    }),
    prisma.withdrawalRequest.findFirst({ where: { playerId: ticket.playerId }, orderBy: { requestedAt: "desc" } }),
    prisma.paymentOrder.findFirst({ where: { playerId: ticket.playerId }, orderBy: { createdAt: "desc" } }),
  ])

  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    assignedAdminId: ticket.assignedAdminId,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    player: {
      id: ticket.player.id,
      username: ticket.player.username,
      externalId: ticket.player.externalId,
      status: ticket.player.status,
      balance: ticket.player.wallet?.balance.toNumber() ?? null,
      currency: ticket.player.wallet?.currency ?? null,
    },
    messages: ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      author: m.authorPlayerId ? ("player" as const) : ("admin" as const),
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt.toISOString(),
    })),
    recentActivity: {
      ledger: recentLedger.map((l) => ({ id: l.id, type: l.type, amount: l.amount.toNumber(), createdAt: l.createdAt.toISOString() })),
      latestWithdrawal: latestWithdrawal
        ? { id: latestWithdrawal.id, status: latestWithdrawal.status, amount: latestWithdrawal.amount.toNumber(), requestedAt: latestWithdrawal.requestedAt.toISOString() }
        : null,
      latestPaymentOrder: latestPaymentOrder
        ? { id: latestPaymentOrder.id, status: latestPaymentOrder.status, amount: latestPaymentOrder.amount.toNumber(), createdAt: latestPaymentOrder.createdAt.toISOString() }
        : null,
    },
  }
}

export async function replyToTicket(req: Request, actorAdminId: string, ticketId: string, body: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { player: { select: { externalId: true } } },
  })
  if (!ticket) throw new AdminApiError("NOT_FOUND", "Ticket not found")

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.supportMessage.create({ data: { ticketId, authorAdminId: actorAdminId, body } })
    // Idempotent no-op if already assigned, first-touch assignment
    // otherwise — always a real field, so this also bumps `updatedAt`
    // (the list's sort key) to reflect the reply, same as a player message.
    await tx.supportTicket.update({
      where: { id: ticketId },
      data: { assignedAdminId: ticket.assignedAdminId ?? actorAdminId },
    })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "ticket.reply",
      entityType: "SupportTicket",
      entityId: ticketId,
    })
    return { id: message.id }
  })

  // Real-time push only — the player still sees the reply on next load via
  // GET /support-tickets/:id regardless, so a missed/delayed push here is
  // never data loss, just a delayed in-app notification.
  await publishPlayerNotification(ticket.player.externalId, {
    message: `Support replied to "${ticket.subject}"`,
    link: `/dashboard/account/support/${ticketId}`,
  })

  return result
}

export async function setTicketStatus(req: Request, actorAdminId: string, ticketId: string, status: SupportTicketStatus) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new AdminApiError("NOT_FOUND", "Ticket not found")
  if (ticket.status === status) return ticket

  return prisma.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({ where: { id: ticketId }, data: { status } })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "ticket.status_changed",
      entityType: "SupportTicket",
      entityId: ticketId,
      before: { status: ticket.status },
      after: { status },
    })
    return updated
  })
}

export function getOpenTicketCount() {
  return prisma.supportTicket.count({ where: { status: "OPEN" } })
}
