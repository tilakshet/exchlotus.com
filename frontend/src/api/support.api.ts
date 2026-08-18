import { apiRequest } from "./http"
import type { SupportTicketDetail, SupportTicketSummary } from "@/types/support"

export function listMyTickets(): Promise<SupportTicketSummary[]> {
  return apiRequest<SupportTicketSummary[]>("/api/support")
}

export function createTicket(input: { subject: string; message: string; image?: File }): Promise<{ id: string }> {
  const body = new FormData()
  body.set("subject", input.subject)
  body.set("message", input.message)
  if (input.image) body.set("image", input.image)
  return apiRequest<{ id: string }>("/api/support", { method: "POST", body })
}

export function getTicket(id: string): Promise<SupportTicketDetail> {
  return apiRequest<SupportTicketDetail>(`/api/support/${id}`)
}

export function replyToTicket(id: string, message: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/api/support/${id}/messages`, { method: "POST", body: { message } })
}
