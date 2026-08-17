import { apiRequest } from "./http"
import type { SupportTicketDetail, SupportTicketSummary } from "@/types/support"

export function listMyTickets(): Promise<SupportTicketSummary[]> {
  return apiRequest<SupportTicketSummary[]>("/api/support")
}

export function createTicket(input: { subject: string; message: string }): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/api/support", { method: "POST", body: input })
}

export function getTicket(id: string): Promise<SupportTicketDetail> {
  return apiRequest<SupportTicketDetail>(`/api/support/${id}`)
}

export function replyToTicket(id: string, message: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/api/support/${id}/messages`, { method: "POST", body: { message } })
}
