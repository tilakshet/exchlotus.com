import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Dices,
  Gamepad2,
  Gauge,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Users as UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  label: string
  to: string
  permission: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Grouped to match the admin panel's actual scope — sections only appear
 * once their modules exist (no dead links to features that aren't built).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", permission: "dashboard.view", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Users", to: "/users", permission: "users.view", icon: UsersIcon },
      { label: "Games", to: "/games", permission: "games.view", icon: Gamepad2 },
      { label: "Game Activity", to: "/game-activity", permission: "ledger.view", icon: Dices },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Deposits", to: "/deposits", permission: "ledger.view", icon: ArrowDownToLine },
      { label: "Withdrawals", to: "/withdrawals", permission: "ledger.view", icon: ArrowUpFromLine },
      { label: "Transactions", to: "/transactions", permission: "ledger.view", icon: ScrollText },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", to: "/reports", permission: "reports.view", icon: BarChart3 }],
  },
  {
    label: "Finance",
    items: [{ label: "Withdrawals", to: "/withdrawals", permission: "withdrawals.view", icon: Landmark }],
  },
  {
    label: "Administration",
    items: [
      { label: "Admins", to: "/admins", permission: "admins.view", icon: ShieldCheck },
      { label: "Roles", to: "/roles", permission: "roles.view", icon: KeyRound },
      { label: "Audit Log", to: "/audit", permission: "audit.view", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [{ label: "Monitoring", to: "/monitoring", permission: "monitoring.view", icon: Gauge }],
  },
]
