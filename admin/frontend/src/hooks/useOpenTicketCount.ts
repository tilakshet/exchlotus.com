import { useQuery } from "@tanstack/react-query"
import { getOpenTicketCount } from "@/api/support.api"
import { useAdminAuth } from "./useAdminAuth"

/** Same polling idiom as the notification bell's unread count — a nav badge, not a push mechanism. */
export function useOpenTicketCount() {
  const { hasPermission } = useAdminAuth()
  const query = useQuery({
    queryKey: ["support-open-count"],
    queryFn: getOpenTicketCount,
    refetchInterval: 30_000,
    enabled: hasPermission("support.view"),
  })
  return query.data?.count ?? 0
}
