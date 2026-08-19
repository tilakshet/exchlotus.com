import { Link } from "@tanstack/react-router"
import { DASHBOARD_NAV_ITEMS, SIDEBAR_EXTRA_NAV_ITEMS, type DashboardNavItem } from "@/data/dashboardShell"

function NavRow({ item }: { item: DashboardNavItem }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/dashboard" }}
      className="group relative flex min-h-11 items-center gap-3 rounded-(--landing-radius-md) py-2 pr-3 pl-3 text-sm font-semibold text-(--landing-text-secondary) outline-none transition-colors duration-200 hover:bg-(--landing-gold)/8 hover:text-(--landing-gold) focus-visible:ring-2 focus-visible:ring-(--landing-gold) data-[status=active]:text-(--landing-gold)"
    >
      {/* Left accent bar, only on the active row — matches dashboard Sidebar.tsx's treatment. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-1 scale-y-0 rounded-full bg-(--landing-gold) transition-transform duration-200 group-data-[status=active]:scale-y-100"
      />
      <item.icon
        className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  )
}

/**
 * Fixed (not scrolling) left rail on desktop (≥1024px), mirroring the
 * dashboard's Sidebar.tsx (one accent color for hover/active, not a
 * per-item rainbow, and Support/Refer & Earn rows below a divider) but on
 * `--landing-*` tokens. Links point at the same real /dashboard/* routes —
 * browsing is open without a session (see routes/dashboard.tsx), so these
 * are valid destinations straight from the landing page too, not a
 * separate landing-only copy. `top` matches LandingHeader's measured
 * single-row height (~76px, same markup as the dashboard's TopNavbar.tsx,
 * which uses the same 76px offset in dashboard-shell/Sidebar.tsx) so it
 * sits directly below the fixed header with no gap or overlap. Narrow
 * (w-44) and tightly padded, matching Sidebar.tsx's width — see its doc
 * comment for why.
 */
export function LandingSidebar() {
  return (
    <nav
      aria-label="Main"
      className="fixed top-[76px] left-0 z-40 hidden h-[calc(100vh-76px)] w-44 flex-col gap-1 overflow-y-auto border-r border-(--landing-border) bg-(--landing-bg-1) px-2.5 py-4 lg:flex"
    >
      {DASHBOARD_NAV_ITEMS.map((item) => (
        <NavRow key={item.id} item={item} />
      ))}

      <div className="my-2 border-t border-(--landing-border)" />

      {SIDEBAR_EXTRA_NAV_ITEMS.map((item) => (
        <NavRow key={item.id} item={item} />
      ))}
    </nav>
  )
}
