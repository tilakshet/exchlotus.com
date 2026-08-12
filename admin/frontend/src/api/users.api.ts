import { apiRequest } from "./http"

export interface UserListItem {
  id: string
  externalId: string
  username: string
  email: string | null
  phone: string | null
  status: "ACTIVE" | "SUSPENDED"
  balance: number | null
  currency: string
  createdAt: string
}

export interface UserDetail {
  id: string
  externalId: string
  username: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  currency: string
  status: "ACTIVE" | "SUSPENDED"
  createdAt: string
  wallet: { balance: number; bonusBalance: number; lockedBalance: number; currency: string } | null
  recentLedger: { id: string; type: string; amount: number; balanceAfter: number; createdAt: string }[]
}

export function listUsers(params: { search?: string; status?: string; cursor?: string; limit?: number }) {
  return apiRequest<{ items: UserListItem[]; nextCursor: string | null }>("/admin-api/users", { query: params })
}

export function getUser(id: string) {
  return apiRequest<UserDetail>(`/admin-api/users/${id}`)
}

export function suspendUser(id: string, reason: string) {
  return apiRequest<{ id: string; status: string }>(`/admin-api/users/${id}/suspend`, { method: "POST", body: { reason } })
}

export function activateUser(id: string, reason: string) {
  return apiRequest<{ id: string; status: string }>(`/admin-api/users/${id}/activate`, { method: "POST", body: { reason } })
}
