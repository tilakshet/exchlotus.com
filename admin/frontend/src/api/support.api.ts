import { apiRequest } from "./http"

export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"

export interface SupportTicketRow {
  id: string
  subject: string
  status: SupportTicketStatus
  player: { id: string; username: string; externalId: string }
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface SupportMessage {
  id: string
  body: string
  author: "player" | "admin"
  createdAt: string
}

export interface SupportTicketDetail {
  id: string
  subject: string
  status: SupportTicketStatus
  assignedAdminId: string | null
  createdAt: string
  updatedAt: string
  player: {
    id: string
    username: string
    externalId: string
    status: "ACTIVE" | "SUSPENDED"
    balance: number | null
    currency: string | null
  }
  messages: SupportMessage[]
  recentActivity: {
    ledger: { id: string; type: string; amount: number; createdAt: string }[]
    latestWithdrawal: { id: string; status: string; amount: number; requestedAt: string } | null
    latestPaymentOrder: { id: string; status: string; amount: number; createdAt: string } | null
  }
}

export function listTickets(params: { status?: SupportTicketStatus; search?: string; cursor?: string; limit?: number } = {}) {
  return apiRequest<{ items: SupportTicketRow[]; nextCursor: string | null }>("/admin-api/support", { query: params })
}

export function getOpenTicketCount() {
  return apiRequest<{ count: number }>("/admin-api/support/open-count")
}

export function getTicket(id: string) {
  return apiRequest<SupportTicketDetail>(`/admin-api/support/${id}`)
}

export function replyToTicket(id: string, message: string) {
  return apiRequest<{ id: string }>(`/admin-api/support/${id}/reply`, { method: "POST", body: { message } })
}

export function setTicketStatus(id: string, status: SupportTicketStatus) {
  return apiRequest<{ id: string; status: SupportTicketStatus }>(`/admin-api/support/${id}/status`, { method: "PATCH", body: { status } })
}
