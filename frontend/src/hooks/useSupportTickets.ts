import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as supportApi from "@/api/support.api"

const supportTicketsQueryKey = ["support-tickets"] as const

export function useSupportTickets() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: supportTicketsQueryKey, queryFn: supportApi.listMyTickets })

  const createMutation = useMutation({
    mutationFn: supportApi.createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportTicketsQueryKey }),
  })

  return {
    tickets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createTicket: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}
