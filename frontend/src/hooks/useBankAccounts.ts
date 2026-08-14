import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as bankAccountsApi from "@/api/bank-accounts.api"

const bankAccountsQueryKey = ["bank-accounts"] as const

/**
 * Real backend-linked payout methods now — used by withdrawals.service.ts
 * on the admin side to actually send money. Was localStorage-only until the
 * real payout gateway existed; see git history if you need that version.
 */
export function useBankAccounts() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: bankAccountsQueryKey, queryFn: bankAccountsApi.listBankAccounts })

  const addMutation = useMutation({
    mutationFn: bankAccountsApi.addBankAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey }),
  })

  const removeMutation = useMutation({
    mutationFn: bankAccountsApi.removeBankAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey }),
  })

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    addAccount: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    removeAccount: removeMutation.mutate,
  }
}
