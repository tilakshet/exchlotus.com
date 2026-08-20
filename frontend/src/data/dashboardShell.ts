import type { LucideIcon } from "lucide-react"
import { ArrowLeftRight, Building2, Crown, Dices, Gift, Home, LifeBuoy, Video, Volleyball } from "lucide-react"

export interface DashboardNavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
  /** Icon chip accent — a distinct color per item instead of every row sharing one flat treatment. Only the theme's two accents (green/purple), no other hues. */
  color: string
}

/**
 * The core sections, shown everywhere navigation appears: desktop Sidebar,
 * the mobile BottomNavBar (dashboard.tsx, and the landing page's
 * routes/index.tsx), and the public landing page's own desktop sidebar
 * (LandingSidebar.tsx) — deliberately static, not derived from
 * Category rows, because "Casino"/"Live Casino" are navigation groupings,
 * not categories themselves (see src/lib/categoryGroups.ts for how real
 * categories map into each). "Providers" links to the real, backend-synced
 * provider list (see useProviders()/CatalogProvidersPage).
 */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { id: "home", label: "Home", to: "/dashboard", icon: Home, color: "var(--sb-accent-gold)" },
  { id: "casino", label: "Casino", to: "/dashboard/casino", icon: Dices, color: "var(--sb-accent-purple)" },
  { id: "live-casino", label: "Live Casino", to: "/dashboard/live-casino", icon: Video, color: "var(--sb-accent-purple)" },
  { id: "providers", label: "Providers", to: "/dashboard/providers", icon: Building2, color: "var(--sb-accent-gold)" },
]

/**
 * Desktop-sidebar-only additions (Sidebar.tsx) — kept out of
 * DASHBOARD_NAV_ITEMS above so the mobile BottomNavBar's compact floating
 * pill (sized for ~4 icons) doesn't get overcrowded, and the landing
 * page's sidebar stays unchanged. Support routes into the real ticket
 * feature (dashboard.account.support.tsx). Refer & Earn routes to its own
 * page (dashboard.refer-earn.tsx) — a real referral code/link a player can
 * share today (recorded on the friend's account at sign-up), honestly
 * flagged there as not yet tied to a reward payout.
 */
export const SIDEBAR_EXTRA_NAV_ITEMS: DashboardNavItem[] = [
  { id: "sportsbook", label: "Sportsbook", to: "/dashboard/sportsbook", icon: Volleyball, color: "var(--sb-accent-purple)" },
  { id: "exchange", label: "Exchange", to: "/dashboard/exchange", icon: ArrowLeftRight, color: "var(--sb-accent-gold)" },
  { id: "loyalty", label: "Loyalty", to: "/dashboard/account/loyalty", icon: Crown, color: "var(--sb-accent-purple)" },
  { id: "support", label: "Support", to: "/dashboard/account/support", icon: LifeBuoy, color: "var(--sb-accent-gold)" },
  { id: "refer-earn", label: "Refer & Earn", to: "/dashboard/refer-earn", icon: Gift, color: "var(--brand-green)" },
]
