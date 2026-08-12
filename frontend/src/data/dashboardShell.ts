import type { LucideIcon } from "lucide-react"
import { Home, Spade, Video, Building2 } from "lucide-react"

export interface DashboardNavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
}

/**
 * The sections the platform actually has. Deliberately static — not
 * derived from Category rows — because "Casino"/"Live Casino" are
 * navigation groupings, not categories themselves (see
 * src/lib/categoryGroups.ts for how real categories map into each).
 * "Providers" links to the real, backend-synced provider list (see
 * useProviders()/CatalogProvidersPage).
 */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home", label: "Home", to: "/dashboard", icon: Home },
  { id: "casino", label: "Casino", to: "/dashboard/casino", icon: Spade },
  { id: "live-casino", label: "Live Casino", to: "/dashboard/live-casino", icon: Video },
  { id: "providers", label: "Providers", to: "/dashboard/providers", icon: Building2 },
]
