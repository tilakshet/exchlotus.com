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

export interface ListWithdrawalsParams {
  status?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  cursor?: string
  limit?: number
}

export function listWithdrawals(params: ListWithdrawalsParams = {}) {
  return apiRequest<{ items: WithdrawalItem[]; nextCursor: string | null }>("/admin-api/withdrawals", {
    query: params as Record<string, string | number | undefined>,
  })
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
