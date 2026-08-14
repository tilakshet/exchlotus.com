import { useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboard, Menu, Users as UsersIcon, BarChart3, ScrollText, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NAV_GROUPS, type NavItem } from "@/lib/nav"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { cn } from "@/lib/utils"

/**
 * The 12 sidebar items don't fit a mobile tab bar (4-5 max is the usable
 * ceiling) — these four cover the destinations an admin checks daily;
 * everything else (Games, Game Activity, Deposits, Withdrawals,
 * Administration, System) lives one tap away behind "More" rather than
 * being dropped.
 */
const PRIMARY_ROUTES: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", permission: "dashboard.view", icon: LayoutDashboard },
  { label: "Users", to: "/users", permission: "users.view", icon: UsersIcon },
  { label: "Transactions", to: "/transactions", permission: "ledger.view", icon: ScrollText },
  { label: "Reports", to: "/reports", permission: "reports.view", icon: BarChart3 },
]

function TabLink({ item, active, onNavigate }: { item: { label: string; to: string; icon: LucideIcon }; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-sidebar-active-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
      )}
    >
      <item.icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

/** Slide-up sheet listing every nav group — the same permission-filtered data Sidebar renders, just reachable from the "More" tab instead of an always-visible rail. */
function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { hasPermission } = useAdminAuth()
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasPermission(i.permission)) })).filter((g) => g.items.length > 0)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          aria-describedby={undefined}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3">
            <DialogPrimitive.Title className="text-sm font-semibold">All sections</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-sm p-1 text-sidebar-foreground/70 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <nav className="flex flex-col gap-4 p-3">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <span className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">{group.label}</span>
                {group.items.map((item) => (
                  <DialogPrimitive.Close key={item.to} asChild>
                    <Link
                      to={item.to}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/85 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </DialogPrimitive.Close>
                ))}
              </div>
            ))}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Mobile-only tab bar (hidden md:up, see AppShell) replacing the desktop
 * rail — a fixed sidebar doesn't fit a phone viewport, and this is the
 * conventional mobile-app nav pattern instead of an off-canvas drawer.
 */
export function BottomNav() {
  const { hasPermission } = useAdminAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [moreOpen, setMoreOpen] = useState(false)

  const tabs = PRIMARY_ROUTES.filter((item) => hasPermission(item.permission))

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        {tabs.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/")
          return <TabLink key={item.to} item={item} active={active} />
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-sidebar-foreground/70 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5 shrink-0" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}
