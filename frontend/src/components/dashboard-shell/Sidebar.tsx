import { Link } from "@tanstack/react-router"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardShell"

/**
 * Fixed (not sticky) left rail on desktop (≥1024px) — stays in place while
 * the page scrolls, per explicit request. `top`/`h` are pinned to
 * TopNavbar's actual rendered height (measured ~76px at desktop widths,
 * see dashboard.tsx's matching `lg:pl-56` content offset) so it sits
 * directly below the header with no gap or overlap. Mobile gets the same
 * items via BottomNavBar instead — see BottomNavBar.tsx and dashboard.tsx.
 */
export function Sidebar() {
  return (
    <nav
      aria-label="Main"
      className="fixed top-[76px] left-0 z-30 hidden h-[calc(100vh-76px)] w-56 flex-col gap-1.5 overflow-y-auto border-r border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] px-3 py-5 lg:flex"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            activeOptions={{ exact: item.to === "/dashboard" }}
            className="group flex min-h-13 items-center gap-3.5 rounded-[var(--sb-radius-md)] px-4 py-3 text-sm font-semibold text-[color:var(--sb-text-secondary)] outline-none transition-all duration-200 hover:translate-x-1 hover:bg-[color:var(--sb-accent-gold)]/10 hover:text-[color:var(--sb-accent-gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] data-[status=active]:bg-[color:var(--sb-accent-gold)]/15 data-[status=active]:text-[color:var(--sb-accent-gold)]"
          >
            <item.icon className="size-7 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-[color:var(--sb-border)] pt-3">
        <ThemeToggle />
      </div>
    </nav>
  )
}
