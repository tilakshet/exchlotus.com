export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"

export interface SupportTicketSummary {
  id: string
  subject: string
  status: SupportTicketStatus
  createdAt: string
  updatedAt: string
  messageCount: number
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
  createdAt: string
  updatedAt: string
  messages: SupportMessage[]
}
