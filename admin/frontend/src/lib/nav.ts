import { LayoutDashboard, ScrollText, ShieldCheck, Users as UsersIcon, KeyRound, Landmark } from "lucide-react"
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
 * Grouped to match Tier 1's actual scope, not the platform's eventual full
 * shape — Finance/Compliance/Support/Reporting/System sections stay out
 * until those modules exist (no dead links to features that aren't built).
 * The section-label pattern itself is what carries forward into Tier 2.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", permission: "dashboard.view", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [{ label: "Users", to: "/users", permission: "users.view", icon: UsersIcon }],
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
]
