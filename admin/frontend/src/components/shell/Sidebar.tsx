import { Link, useRouterState } from "@tanstack/react-router"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { NAV_GROUPS } from "@/lib/nav"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { useOpenTicketCount } from "@/hooks/useOpenTicketCount"
import { useAppDispatch, useAppSelector } from "@/store"
import { sidebarToggled } from "@/store/uiSlice"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const { hasPermission } = useAdminAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const openTicketCount = useOpenTicketCount()

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasPermission(i.permission)) })).filter(
    (g) => g.items.length > 0
  )

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={cn("flex h-12 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        <img src="/lotus.png" alt="" className="size-5 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate text-sm font-semibold tracking-wide">Exchlotus Admin</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {!collapsed && (
              <span className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/")
              const link = (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-sidebar-active font-medium text-sidebar-active-foreground hover:bg-sidebar-active",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {!collapsed && (
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{item.label}</span>
                      {item.to === "/support" && openTicketCount > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                          {openTicketCount > 99 ? "99+" : openTicketCount}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              )

              if (!collapsed) return link

              return (
                <Tooltip key={item.to} delayDuration={200}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => dispatch(sidebarToggled())}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "flex h-10 items-center gap-2 border-t border-sidebar-border px-3 text-xs text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? <ChevronsRight className="size-4" aria-hidden="true" /> : <ChevronsLeft className="size-4" aria-hidden="true" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  )
}
