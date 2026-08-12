import { apiRequest } from "./http"

export interface WalletDetails {
  playerId: string
  username: string
  balance: number
  bonusBalance: number
  lockedBalance: number
  currency: string
  updatedAt: string
}

export interface LedgerItem {
  id: string
  type: string
  amount: number
  balanceAfter: number
  gameId: string
  roundId: string
  actorAdminId: string | null
  createdAt: string
}

export function getWallet(playerId: string) {
  return apiRequest<WalletDetails>(`/admin-api/wallets/${playerId}`)
}

export function getLedger(playerId: string, params: { cursor?: string; limit?: number } = {}) {
  return apiRequest<{ items: LedgerItem[]; nextCursor: string | null }>(`/admin-api/wallets/${playerId}/ledger`, { query: params })
}

export function adjustWallet(playerId: string, input: { type: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT"; amount: number; reason: string }) {
  return apiRequest<{ balance: number; ledgerEntryId: string }>(`/admin-api/wallets/${playerId}/adjust`, {
    method: "POST",
    body: input,
  })
}
