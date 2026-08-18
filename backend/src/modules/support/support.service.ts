import { prisma } from "../../lib/prisma"

// No gaming-provider correlation needed here (tickets are purely internal),
// so this uses req.auth!.sub (the internal Player.id) directly — same
// convention as profile.controller.ts, simpler than wallet/payments/
// bank-accounts' externalId-then-resolve pattern, which exists there only
// because those modules also have to correlate against the provider's
// user_id.

export async function createTicket(playerId: string, subject: string, body: string, attachmentUrl?: string) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({ data: { playerId, subject } })
    await tx.supportMessage.create({ data: { ticketId: ticket.id, authorPlayerId: playerId, body, attachmentUrl } })
    return ticket
  })
}

export async function listMyTickets(playerId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { playerId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  })
  return tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    messageCount: t._count.messages,
  }))
}

/** Returns null if the ticket doesn't exist or isn't this player's — a player never learns which case, same as bank-accounts.service.ts's ownership check. */
export async function getMyTicket(playerId: string, ticketId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, playerId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })
  if (!ticket) return null

  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      author: m.authorPlayerId ? ("player" as const) : ("admin" as const),
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

/** Returns null under the same "doesn't exist or isn't yours" condition as getMyTicket. */
export async function replyToMyTicket(playerId: string, ticketId: string, body: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, playerId } })
  if (!ticket) return null

  // A player replying to a ticket the team considered done is clearly still
  // unresolved for them — no dead end where their only option is opening a
  // brand new ticket instead of continuing the conversation.
  const reopen = ticket.status === "RESOLVED" || ticket.status === "CLOSED"

  return prisma.$transaction(async (tx) => {
    const message = await tx.supportMessage.create({ data: { ticketId, authorPlayerId: playerId, body } })
    // Always a real `.update()` call (even a same-value status write) so
    // `updatedAt` bumps on every reply, not just a reopen — listMyTickets
    // sorts by updatedAt to surface the most recently active conversation.
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: reopen ? "OPEN" : ticket.status } })
    return message
  })
}
