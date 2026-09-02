import { apiRequest } from "./http"

export interface BankAccountItem {
  id: string
  player: { id: string; username: string; phone: string | null }
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifsc: string
  createdAt: string
  sharedWithOtherPlayers: boolean
}

export function listBankAccounts(params: { search?: string; cursor?: string; limit?: number } = {}) {
  return apiRequest<{ items: BankAccountItem[]; nextCursor: string | null }>("/admin-api/bank-accounts", { query: params })
}
