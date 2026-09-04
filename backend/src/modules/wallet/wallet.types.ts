import type { LedgerEntryType } from "@prisma/client"

export interface ApplyLedgerEntryInput {
  playerExternalId: string
  type: LedgerEntryType
  transactionId: string
  roundId: string
  gameId: string
  sessionId?: string
  /** Signed: negative for debits (bet), positive for credits (win/refund). */
  amount: number
}

export interface ApplyLedgerEntryResult {
  balance: number
  /** True if this request was a duplicate of an already-applied entry — no new ledger action was taken. */
  replayed: boolean
}

export interface WalletDetails {
  balance: number
  /** Current balance that represents winnings available for withdrawal. */
  withdrawableCash: number
  /** Always 0 today — no bonus/wagering-requirement engine exists yet. See README. */
  bonusBalance: number
  /** Always 0 today — no funds-locking feature (e.g. pending KYC hold) exists yet. */
  lockedBalance: number
  currency: string
  updatedAt: string
}

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
