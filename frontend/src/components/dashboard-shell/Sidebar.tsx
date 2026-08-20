import { Link } from "@tanstack/react-router"
import { DASHBOARD_NAV_ITEMS, SIDEBAR_EXTRA_NAV_ITEMS, type DashboardNavItem } from "@/data/dashboardShell"

function NavRow({ item }: { item: DashboardNavItem }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/dashboard" }}
      className="group relative flex min-h-15 items-center gap-3 rounded-[var(--sb-radius-md)] py-2 pr-3 pl-3 text-sm font-semibold text-[color:var(--sb-text-secondary)] outline-none transition-colors duration-200 hover:bg-[color:var(--sb-accent-gold)]/8 hover:text-[color:var(--sb-accent-gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] data-[status=active]:text-[color:var(--sb-accent-gold)]"
    >
      {/* Left accent bar, only on the active row. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-1 scale-y-0 rounded-full bg-[color:var(--sb-accent-gold)] transition-transform duration-200 group-data-[status=active]:scale-y-100"
      />
      {/* A round chip notched like a casino chip's edge (dashed inner ring),
          not a per-item color (see header comment: a rainbow reads as
          generic/AI-generated) and not a plain rounded-square box either —
          on-brand for a betting product. Glow reuses the exact soft-gold
          blur already behind the header/footer logo (LandingHeader.tsx,
          LandingFooter.tsx), so this reads as the same hand throughout. */}
      <span aria-hidden="true" className="relative flex size-12 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 -z-10 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70 group-data-[status=active]:opacity-90"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--sb-accent-gold) 55%, transparent), transparent 70%)" }}
        />
        <span
          className="relative flex size-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{ background: "var(--landing-glass)", boxShadow: "inset 0 0 0 1.5px var(--sb-border)" }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-[3px] rounded-full border border-dashed opacity-50 transition-colors duration-200 group-hover:opacity-90 group-data-[status=active]:opacity-90"
            style={{ borderColor: "var(--sb-border)" }}
          />
          <item.icon className="relative size-6.5" strokeWidth={2} aria-hidden="true" />
        </span>
      </span>
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
