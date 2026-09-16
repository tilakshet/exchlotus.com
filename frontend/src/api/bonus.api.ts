import { apiRequest } from "./http"

export interface BonusWalletSummary {
  coinBalance: number
  coinsPerRupee: number
  convertibleRupeeValue: number
  eligibleForConversion: boolean
  coinsUntilEligible: number
  playableBonusBalance: number
}

export function getBonusWallet(): Promise<BonusWalletSummary> {
  return apiRequest<BonusWalletSummary>("/api/bonus/wallet")
}

export interface BonusRules {
  coinsPerRupee: number
  welcomeBonusCoins: number
  referralJoinBonusCoins: number
  referralFirstDepositBonusCoins: number
  conversionCoinThreshold: number
  conversionRupeeValue: number
  conversionPayoutPercent: number
  conversionPayoutRupees: number
}

export function getBonusRules(): Promise<BonusRules> {
  return apiRequest<BonusRules>("/api/bonus/rules")
}

export type BonusTransactionType =
  | "REFERRAL_CASH_REWARD"
  | "REFERRAL_COIN_REWARD"
  | "REFERRAL_REVERSAL"
  | "REFERRAL_EXPIRY"
  | "ADMIN_ADJUSTMENT"
  | "WELCOME_BONUS"
  | "REFERRAL_JOIN_BONUS"
  | "REFERRAL_FIRST_DEPOSIT_BONUS"
  | "BONUS_CONVERSION"
  | "BONUS_ADJUSTMENT"
  | "BONUS_REVERSAL"

export interface BonusTransactionEntry {
  id: string
  type: BonusTransactionType
  amount: number
  currency: string
  balanceBefore: number | null
  balanceAfter: number | null
  status: string
  description: string | null
  referralId: string | null
  relatedDepositId: string | null
  createdAt: string
}

export function getBonusTransactions(params: { cursor?: string; limit?: number } = {}): Promise<{ items: BonusTransactionEntry[]; nextCursor: string | null }> {
  return apiRequest<{ items: BonusTransactionEntry[]; nextCursor: string | null }>("/api/bonus/transactions", { query: params })
}

export interface ConvertCoinsResult {
  conversionId: string
  coinsDebited: number
  rupeesCredited: number
  coinBalance: number
  balance: number
  protectedPrincipal: number
  playableBonusBalance: number
}

export function convertBonusCoins(idempotencyKey: string): Promise<ConvertCoinsResult> {
  return apiRequest<ConvertCoinsResult>("/api/bonus/convert", { method: "POST", body: { idempotencyKey } })
}
