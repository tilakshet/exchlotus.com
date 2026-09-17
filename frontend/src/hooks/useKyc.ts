import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as kycApi from "@/api/kyc.api"
import { profileQueryKey } from "./useProfile"

const kycQueryKey = ["kyc", "me"] as const

export function useMyKyc() {
  return useQuery({ queryKey: kycQueryKey, queryFn: kycApi.getMyKyc })
}

export function useVerifyPan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: kycApi.verifyPan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kycQueryKey })
      queryClient.invalidateQueries({ queryKey: profileQueryKey })
    },
  })
}

