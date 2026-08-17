import { Link } from "@tanstack/react-router"
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardShell"

/**
 * Fixed (not scrolling) left rail on desktop (≥1024px), mirroring the
 * dashboard's Sidebar.tsx but on `--landing-*` tokens. Links point at the
 * same real /dashboard/* routes — browsing is open without a session (see
 * routes/dashboard.tsx), so these are valid destinations straight from the
 * landing page too, not a separate landing-only copy. `top` matches
 * LandingHeader's measured single-row height (~76px, same markup as the
 * dashboard's TopNavbar.tsx, which uses the same 76px offset in
 * dashboard-shell/Sidebar.tsx) so it sits directly below the fixed header
 * with no gap or overlap.
 */
export function LandingSidebar() {
  return (
    <nav
      aria-label="Main"
      className="fixed top-[76px] left-0 z-40 hidden h-[calc(100vh-76px)] w-56 flex-col gap-1.5 overflow-y-auto border-r border-(--landing-border) bg-(--landing-bg-1) px-3 py-5 lg:flex"
    >
      {DASHBOARD_NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          activeOptions={{ exact: item.to === "/dashboard" }}
          className="group flex min-h-13 items-center gap-3.5 rounded-(--landing-radius-md) px-4 py-3 text-sm font-semibold text-(--landing-text-secondary) outline-none transition-all duration-200 hover:translate-x-1 hover:bg-(--landing-gold)/10 hover:text-(--landing-gold) focus-visible:ring-2 focus-visible:ring-(--landing-gold) data-[status=active]:bg-(--landing-gold)/15 data-[status=active]:text-(--landing-gold)"
        >
          <item.icon className="size-7 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
