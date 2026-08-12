/**
 * The provider's category feed is flat (Category.code/name only) — there is
 * no "live" or "group" field in the sync pipeline. This is a heuristic split
 * by real game format (dealer-hosted table formats vs everything else), not
 * data from the provider. Every code below is a real, synced category; a
 * code NOT in this set defaults to Casino, so newly-synced categories are
 * never silently dropped from either hub.
 */
export const LIVE_CASINO_CATEGORY_CODES = new Set([
  "baccarat",
  "blackjack",
  "roulette",
  "dragontiger",
  "andarbahar",
  "sicbo",
  "teenpatti",
  "poker",
  "gameshow",
  "hi-lo",
  "tablegames",
])

export function isLiveCasinoCategory(code: string): boolean {
  return LIVE_CASINO_CATEGORY_CODES.has(code)
}
