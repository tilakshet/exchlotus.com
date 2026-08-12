export interface LoyaltyTier {
  name: string
  stars: number
  pointsFrom: number
  /** null = no upper bound (top tier). Points are 1 INR deposited = 1 point. */
  pointsTo: number | null
  cashbackPct: number
  depositBonusPct: number
  freeWithdrawals: number | "Unlimited"
}

/**
 * Static program definition — there's no VIP/loyalty backend module yet
 * (no accrual tracking, see CLAUDE.md's module list), so these are the
 * real tier rules as content, not live account data.
 */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: "Silver", stars: 1, pointsFrom: 0, pointsTo: 2_500_000, cashbackPct: 2, depositBonusPct: 2, freeWithdrawals: 39 },
  { name: "Gold", stars: 2, pointsFrom: 2_500_000, pointsTo: 4_000_000, cashbackPct: 3, depositBonusPct: 3, freeWithdrawals: "Unlimited" },
  { name: "Pearl", stars: 3, pointsFrom: 4_000_000, pointsTo: 10_000_000, cashbackPct: 4, depositBonusPct: 4, freeWithdrawals: "Unlimited" },
  { name: "Diamond", stars: 4, pointsFrom: 10_000_000, pointsTo: null, cashbackPct: 5, depositBonusPct: 5, freeWithdrawals: "Unlimited" },
]

/**
 * Every account starts here — there's no accrual mechanism yet to compute
 * a real current tier/points from lifetime deposits, so this is an honest
 * "not tracked yet" default, not fabricated progress. Points are always 0.
 */
export const CURRENT_LOYALTY_TIER = LOYALTY_TIERS[0]
export const CURRENT_LOYALTY_POINTS = 0
