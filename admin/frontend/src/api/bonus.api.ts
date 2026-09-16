import { apiRequest } from "./http"

export interface BonusWalletDetails {
  playerId: string
  username: string
  coinBalance: number
  bonusBalance: number
  playableBonusBalance: number
  updatedAt: string
}

export interface BonusTransactionItem {
  id: string
  type: string
  amount: number
  currency: string
  balanceBefore: number | null
  balanceAfter: number | null
  status: string
  description: string | null
  referralId: string | null
  relatedDepositId: string | null
  actorAdminId: string | null
  createdAt: string
}

export function getBonusWallet(playerId: string) {
  return apiRequest<BonusWalletDetails>(`/admin-api/bonus/${playerId}`)
}

export function getBonusTransactions(playerId: string, params: { cursor?: string; limit?: number } = {}) {
  return apiRequest<{ items: BonusTransactionItem[]; nextCursor: string | null }>(`/admin-api/bonus/${playerId}/transactions`, { query: params })
}

export function adjustBonusCoins(playerId: string, input: { coins: number; reason: string; idempotencyKey: string }) {
  return apiRequest<{ coinBalance: number; bonusTransactionId: string }>(`/admin-api/bonus/${playerId}/adjust`, {
    method: "POST",
    body: input,
  })
}
