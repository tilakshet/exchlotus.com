import type { BonusTransactionType } from "@prisma/client"
import type { BonusRules } from "../../lib/bonusConfig"

export interface BonusWalletSummary {
  coinBalance: number
  coinsPerRupee: number
  convertibleRupeeValue: number
  eligibleForConversion: boolean
  coinsUntilEligible: number
  /** Display-only — see Wallet.bonusPlayableBalance's doc comment (schema.prisma). Not the withdrawal-eligibility floor; that's wallet.protectedPrincipal, unchanged. */
  playableBonusBalance: number
}

export type { BonusRules }

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

export interface BonusTransactionPage {
  items: BonusTransactionEntry[]
  nextCursor: string | null
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
