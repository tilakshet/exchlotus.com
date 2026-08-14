import { apiRequest } from "./http"

export type LedgerEntryType = "BET" | "WIN" | "REFUND" | "ADJUSTMENT" | "DEPOSIT" | "WITHDRAWAL"

export interface GlobalLedgerItem {
  id: string
  type: LedgerEntryType
  amount: number
  balanceAfter: number
  transactionId: string
  roundId: string
  gameId: string
  sessionId: string | null
  actorAdminId: string | null
  createdAt: string
  player: { id: string; username: string; externalId: string; currency: string }
}

export interface ListGlobalLedgerParams {
  type?: LedgerEntryType[]
  search?: string
  gameId?: string
  roundId?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
  cursor?: string
  limit?: number
}

export function listGlobalLedger(params: ListGlobalLedgerParams = {}) {
  const { type, ...rest } = params
  return apiRequest<{ items: GlobalLedgerItem[]; nextCursor: string | null }>("/admin-api/ledger", {
    // apiRequest's query bag is string|number only — a type array is
    // joined into the comma-separated form ledger.controller.ts already
    // parses (see its listQuerySchema transform).
    query: { ...rest, type: type && type.length > 0 ? type.join(",") : undefined },
  })
}
