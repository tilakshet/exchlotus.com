import { useQuery } from "@tanstack/react-query"
import { getProviders } from "@/api/provider.api"

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: getProviders,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })
}
