/**
 * Display-only mirror of backend/src/lib/bonusConfig.ts — this frontend is
 * a separate deployable and can't import backend TS directly. Used purely
 * for instant UI formatting/disabled-state hints before the network
 * round-trip to GET /api/bonus/rules resolves; the frontend never computes
 * eligibility or financial amounts itself, the backend is the only source
 * of truth for those.
 */

export const COINS_PER_RUPEE = 100
export const CONVERSION_COIN_THRESHOLD = 50000
export const CONVERSION_PAYOUT_PERCENT = 70
export const CONVERSION_RUPEE_VALUE = CONVERSION_COIN_THRESHOLD / COINS_PER_RUPEE
export const CONVERSION_PAYOUT_RUPEES = (CONVERSION_RUPEE_VALUE * CONVERSION_PAYOUT_PERCENT) / 100
