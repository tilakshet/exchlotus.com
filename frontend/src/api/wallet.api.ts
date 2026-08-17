import { apiRequest } from "./http"
import type { TransactionHistoryPage, WalletDetails, WithdrawalRequestResult } from "@/types/wallet"

export function getWallet(): Promise<WalletDetails> {
  return apiRequest<WalletDetails>("/api/wallet")
}

export function getTransactionHistory(params: { cursor?: string; limit?: number } = {}): Promise<TransactionHistoryPage> {
  return apiRequest<TransactionHistoryPage>("/api/wallet/history", { query: params })
}

// Real deposits go through payments.api.ts (createDepositOrder) instead —
// see backend/src/modules/payments. This reserves the amount and creates a
// PENDING request for admin review; no balance change happens yet.
export function withdraw(input: { amount: number; bankAccountId: string }): Promise<WithdrawalRequestResult> {
  return apiRequest<WithdrawalRequestResult>("/api/wallet/withdraw", { method: "POST", body: input })
}
