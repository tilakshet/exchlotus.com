import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as walletApi from "@/api/wallet.api"
import { createDepositOrder } from "@/api/payments.api"
import { useAppSelector } from "@/store"

export const walletQueryKey = ["wallet"] as const

/**
 * Balances are always server-authoritative — this hook never computes a
 * balance locally, only ever displays what the backend last returned.
 * staleTime is short (frequent bets/wins) but the real-time correctness
 * guarantee comes from services/socket.service.ts invalidating this query
 * on every `wallet:update` event, not from polling.
 */
export function useWallet() {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)
  return useQuery({
    queryKey: walletQueryKey,
    queryFn: walletApi.getWallet,
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
    retry: 1,
  })
}

/**
 * Doesn't touch the wallet at all — the balance only actually updates once
 * the gateway's callback lands (backend payments.service.ts), which arrives
 * over the existing wallet:update socket event, not this mutation's result.
 * Callers redirect to `paymentUrl` on success.
 */
export function useCreateDepositOrder() {
  return useMutation({ mutationFn: createDepositOrder })
}

export function useWithdraw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.withdraw,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletQueryKey })
      queryClient.invalidateQueries({ queryKey: ["wallet", "history"] })
    },
  })
}
