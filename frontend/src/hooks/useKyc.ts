import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as kycApi from "@/api/kyc.api"
import { profileQueryKey } from "./useProfile"

const kycQueryKey = ["kyc", "me"] as const

export function useMyKyc() {
  return useQuery({ queryKey: kycQueryKey, queryFn: kycApi.getMyKyc })
}

export function useSubmitKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: kycApi.submitKyc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kycQueryKey })
      // profile.kycStatus is the field the withdraw page's gate actually
      // reads — without this it'd keep showing NOT_SUBMITTED until
      // something else happens to refetch profile.
      queryClient.invalidateQueries({ queryKey: profileQueryKey })
    },
  })
}

