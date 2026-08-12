import { useQuery } from "@tanstack/react-query"
import { getCategories } from "@/api/catalog.api"

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })
}
