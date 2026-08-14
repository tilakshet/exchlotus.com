import { apiRequest } from "./http"

export interface WithdrawalItem {
  id: string
  playerId: string
  username: string
  amount: number
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "PAID" | "FAILED"
  bankAccount: {
    accountHolderName: string
    bankName: string
    accountNumber: string
    ifsc: string
  }
  gatewayUtr: string | null
  reason: string | null
  requestedAt: string
  decidedAt: string | null
}

export function listWithdrawals(params: { status?: string } = {}) {
  return apiRequest<WithdrawalItem[]>("/admin-api/withdrawals", { query: params })
}

export function approveWithdrawal(id: string) {
  return apiRequest<{ id: string; status: string; gatewayUtr: string | null }>(`/admin-api/withdrawals/${id}/approve`, {
    method: "POST",
  })
}

export function rejectWithdrawal(id: string, reason: string) {
  return apiRequest<{ id: string; status: string }>(`/admin-api/withdrawals/${id}/reject`, {
    method: "POST",
    body: { reason },
  })
}
