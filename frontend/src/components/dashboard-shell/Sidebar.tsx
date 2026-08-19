import { Link } from "@tanstack/react-router"
import { DASHBOARD_NAV_ITEMS, SIDEBAR_EXTRA_NAV_ITEMS, type DashboardNavItem } from "@/data/dashboardShell"

function NavRow({ item }: { item: DashboardNavItem }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/dashboard" }}
      className="group relative flex min-h-11 items-center gap-3 rounded-[var(--sb-radius-md)] py-2 pr-3 pl-3 text-sm font-semibold text-[color:var(--sb-text-secondary)] outline-none transition-colors duration-200 hover:bg-[color:var(--sb-accent-gold)]/8 hover:text-[color:var(--sb-accent-gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] data-[status=active]:text-[color:var(--sb-accent-gold)]"
    >
      {/* Left accent bar, only on the active row. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-1 scale-y-0 rounded-full bg-[color:var(--sb-accent-gold)] transition-transform duration-200 group-data-[status=active]:scale-y-100"
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
 * Fixed (not sticky) left rail on desktop (≥1024px) — stays in place while
 * the page scrolls, per explicit request. `top`/`h` are pinned to
 * TopNavbar's actual rendered height (measured ~76px at desktop widths,
 * see dashboard.tsx's matching `lg:pl-44` content offset) so it sits
 * directly below the header with no gap or overlap. Mobile gets the core
 * items via BottomNavBar instead — see BottomNavBar.tsx and dashboard.tsx.
 *
 * One accent color (brand gold) for hover/active across every row, rather
 * than a distinct tint per item — a per-item rainbow of pastel icon chips
 * read as a generic, AI-generated-dashboard look, not a deliberate design
 * system. Narrow (w-44) and tightly padded rather than the wider w-56 this
 * started at — with no icon chips left to fill, the extra width was just
 * empty space next to short one/two-word labels.
 */
export function Sidebar() {
  return (
    <nav
      aria-label="Main"
      className="fixed top-[76px] left-0 z-30 hidden h-[calc(100vh-76px)] w-44 flex-col gap-1 overflow-y-auto border-r border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] px-2.5 py-4 lg:flex"
    >
      <div className="flex flex-1 flex-col gap-1">
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <NavRow key={item.id} item={item} />
        ))}

        <div className="my-2 border-t border-[color:var(--sb-border)]" />

        {SIDEBAR_EXTRA_NAV_ITEMS.map((item) => (
          <NavRow key={item.id} item={item} />
        ))}
      </div>
    </nav>
  )
}
