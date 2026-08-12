import { apiRequest } from "./http"
import type { LedgerMutationResult, TransactionHistoryPage, WalletDetails } from "@/types/wallet"

export function getWallet(): Promise<WalletDetails> {
  return apiRequest<WalletDetails>("/api/wallet")
}

export function getTransactionHistory(params: { cursor?: string; limit?: number } = {}): Promise<TransactionHistoryPage> {
  return apiRequest<TransactionHistoryPage>("/api/wallet/history", { query: params })
}

// See backend README: instant/unconditional, not real payment processing.
export function deposit(amount: number): Promise<LedgerMutationResult> {
  return apiRequest<LedgerMutationResult>("/api/wallet/deposit", { method: "POST", body: { amount } })
}

export function withdraw(amount: number): Promise<LedgerMutationResult> {
  return apiRequest<LedgerMutationResult>("/api/wallet/withdraw", { method: "POST", body: { amount } })
}
