import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck } from "lucide-react"
import { getUnreadNotificationCount, listNotifications, markNotificationsRead } from "@/api/notifications.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDateTime } from "@/lib/utils"

function describeAction(action: string, entityType: string) {
  return `${action.replaceAll(".", " ").replaceAll("_", " ")} · ${entityType}`
}

/**
 * Derived read-only from the audit log (admin-api/notifications) — see
 * notifications.service.ts's doc-comment. Polls, same idiom the dashboard
 * already uses for its own refresh, rather than introducing a new
 * real-time mechanism.
 */
export function NotificationBell() {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const unread = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 30_000,
    enabled: hasPermission("notifications.view"),
  })

  const feed = useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () => listNotifications({ limit: 15 }),
    enabled: open && hasPermission("notifications.view"),
  })

  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  if (!hasPermission("notifications.view")) return null

  const count = unread.data?.count ?? 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"} className="relative">
          <Bell className="size-4" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          <Button variant="ghost" size="sm" disabled={count === 0 || markRead.isPending} onClick={() => markRead.mutate()}>
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {feed.isLoading && <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>}
          {!feed.isLoading && feed.data?.items.length === 0 && (
            <EmptyState icon={Bell} title="No notifications" description="Large withdrawals, suspensions and admin changes show up here." />
          )}
          {feed.data?.items.map((n) => (
            <Link
              key={n.id}
              to="/audit"
              onClick={() => setOpen(false)}
              className="flex items-start gap-2 border-b border-border px-3 py-2.5 outline-none last:border-0 hover:bg-hover-tint focus-visible:bg-hover-tint"
            >
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-foreground capitalize">{describeAction(n.action, n.entityType)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {n.adminName}
                  {n.reason ? ` — ${n.reason}` : ""}
                </span>
                <span className="block text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
              </span>
            </Link>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
