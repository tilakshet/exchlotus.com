export interface WalletDetails {
  balance: number
  bonusBalance: number
  lockedBalance: number
  currency: string
  updatedAt: string
}

export type LedgerEntryType = "BET" | "WIN" | "REFUND" | "ADJUSTMENT" | "DEPOSIT" | "WITHDRAWAL"

export interface TransactionHistoryEntry {
  id: string
  type: LedgerEntryType
  amount: number
  balanceAfter: number
  gameId: string
  roundId: string
  createdAt: string
}

export interface TransactionHistoryPage {
  items: TransactionHistoryEntry[]
  nextCursor: string | null
}

export interface WithdrawalRequestResult {
  status: "PENDING"
  withdrawalId: string
  balance: number
  lockedBalance: number
}
