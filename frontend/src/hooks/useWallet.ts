import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as walletApi from "@/api/wallet.api"
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

export function useDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.deposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletQueryKey })
      queryClient.invalidateQueries({ queryKey: ["wallet", "history"] })
    },
  })
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
