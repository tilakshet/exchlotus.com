import { apiRequest } from "./http"

export type LoginEventMethod = "PASSWORD" | "OTP" | "REGISTER"
export type LoginEventResult = "SUCCESS" | "FAILURE"

export interface LoginEventItem {
  id: string
  playerId: string | null
  playerUsername: string | null
  phone: string
  method: LoginEventMethod
  result: LoginEventResult
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export function listLoginEvents(params: {
  playerId?: string
  phone?: string
  result?: LoginEventResult
  method?: LoginEventMethod
  cursor?: string
  limit?: number
}) {
  return apiRequest<{ items: LoginEventItem[]; nextCursor: string | null }>("/admin-api/login-events", { query: params })
}
