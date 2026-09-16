import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as bonusApi from "@/api/bonus.api"
import { walletQueryKey } from "./useWallet"
import { useAppSelector } from "@/store"

export const bonusWalletQueryKey = ["bonus", "wallet"] as const
export const bonusRulesQueryKey = ["bonus", "rules"] as const
export const bonusTransactionsQueryKey = ["bonus", "transactions"] as const

/**
 * Same "server is always authoritative" contract as useWallet — this hook
 * never computes coin balance or conversion eligibility locally, only ever
 * displays what the backend last returned.
 */
export function useBonusWallet() {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)
  return useQuery({
    queryKey: bonusWalletQueryKey,
    queryFn: bonusApi.getBonusWallet,
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
    retry: 1,
  })
}

// Rules are static config, not per-user state — cached far longer than the
// wallet balance and fetched even for a logged-out visitor (the Bonus page
// shows the rules panel regardless of auth state).
export function useBonusRules() {
  return useQuery({
    queryKey: bonusRulesQueryKey,
    queryFn: bonusApi.getBonusRules,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBonusTransactions(params: { cursor?: string; limit?: number } = {}) {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)
  return useQuery({
    queryKey: [...bonusTransactionsQueryKey, params],
    queryFn: () => bonusApi.getBonusTransactions(params),
    enabled: isAuthenticated,
  })
}

/**
 * Takes the idempotency key as a mutate-time argument rather than
 * generating one internally — the caller (the Bonus page) mints one
 * `crypto.randomUUID()` per submit intent and reuses it across a manual
 * retry (e.g. re-clicking Convert after a network error), so a genuine
 * double-submit lands as a safe replay server-side instead of two distinct
 * (and therefore both-valid-looking) requests. Same pattern as admin's
 * AdjustBalanceForm.
 */
export function useConvertBonusCoins() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idempotencyKey: string) => bonusApi.convertBonusCoins(idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bonusWalletQueryKey })
      queryClient.invalidateQueries({ queryKey: bonusTransactionsQueryKey })
      queryClient.invalidateQueries({ queryKey: walletQueryKey })
    },
  })
}
