import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getProfile, updateProfile } from "@/api/profile.api"
import { useAppSelector } from "@/store"

export const profileQueryKey = ["profile"] as const

export function useProfile() {
  const isAuthenticated = useAppSelector((s) => s.auth.user !== null)
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: getProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
    },
  })
}
