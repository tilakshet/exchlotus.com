/**
 * Single source of truth for the bonus system's coin economy — every other
 * file (bonus.service.ts, referral.service.ts, the /api/bonus/rules
 * endpoint, tests) imports these instead of repeating the numbers. All
 * values are integers; nothing here is a floating-point currency
 * calculation.
 */

export const COINS_PER_RUPEE = 100

export const WELCOME_BONUS_COINS = 5000
export const REFERRAL_JOIN_BONUS_COINS = 5000
export const REFERRAL_FIRST_DEPOSIT_BONUS_COINS = 5000

export const CONVERSION_COIN_THRESHOLD = 50000
export const CONVERSION_PAYOUT_PERCENT = 70

/** 50,000 coins = ₹500. */
export const CONVERSION_RUPEE_VALUE = CONVERSION_COIN_THRESHOLD / COINS_PER_RUPEE
/** ₹500 × 70% = ₹350 playable. */
export const CONVERSION_PAYOUT_RUPEES = (CONVERSION_RUPEE_VALUE * CONVERSION_PAYOUT_PERCENT) / 100

/** Throws on a non-integer input — coin balances are never fractional. */
export function coinsToRupees(coins: number): number {
  if (!Number.isInteger(coins)) {
    throw new Error(`coinsToRupees expects an integer coin amount, got ${coins}`)
  }
  return coins / COINS_PER_RUPEE
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

export function getBonusRules(): BonusRules {
  return {
    coinsPerRupee: COINS_PER_RUPEE,
    welcomeBonusCoins: WELCOME_BONUS_COINS,
    referralJoinBonusCoins: REFERRAL_JOIN_BONUS_COINS,
    referralFirstDepositBonusCoins: REFERRAL_FIRST_DEPOSIT_BONUS_COINS,
    conversionCoinThreshold: CONVERSION_COIN_THRESHOLD,
    conversionRupeeValue: CONVERSION_RUPEE_VALUE,
    conversionPayoutPercent: CONVERSION_PAYOUT_PERCENT,
    conversionPayoutRupees: CONVERSION_PAYOUT_RUPEES,
  }
}
