import { Link } from "@tanstack/react-router"
import { DASHBOARD_NAV_ITEMS, SIDEBAR_EXTRA_NAV_ITEMS, type DashboardNavItem } from "@/data/dashboardShell"

function NavRow({ item }: { item: DashboardNavItem }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/dashboard" }}
      className="group relative flex min-h-15 items-center gap-3 rounded-(--landing-radius-md) py-2 pr-3 pl-3 text-sm font-semibold text-(--landing-text-secondary) outline-none transition-colors duration-200 hover:bg-(--landing-gold)/8 hover:text-(--landing-gold) focus-visible:ring-2 focus-visible:ring-(--landing-gold) data-[status=active]:text-(--landing-gold)"
    >
      {/* Left accent bar, only on the active row — matches dashboard Sidebar.tsx's treatment. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-1 scale-y-0 rounded-full bg-(--landing-gold) transition-transform duration-200 group-data-[status=active]:scale-y-100"
      />
      {/* A round chip notched like a casino chip's edge (dashed inner ring)
          rather than the generic rounded-square icon box every AI-scaffolded
          dashboard reaches for — on-brand for a betting product, not just a
          bigger box. The hover/active glow reuses the exact soft-gold blur
          already behind the header/footer logo (LandingHeader.tsx,
          LandingFooter.tsx), so this reads as the same hand, not a new
          effect invented just for this row. */}
      <span aria-hidden="true" className="relative flex size-12 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 -z-10 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70 group-data-[status=active]:opacity-90"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--landing-gold) 55%, transparent), transparent 70%)" }}
        />
        <span
          className="relative flex size-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{ background: "var(--landing-glass)", boxShadow: "inset 0 0 0 1.5px var(--landing-border)" }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-[3px] rounded-full border border-dashed opacity-50 transition-colors duration-200 group-hover:opacity-90 group-data-[status=active]:opacity-90"
            style={{ borderColor: "var(--landing-border-strong)" }}
          />
          <item.icon className="relative size-6.5" strokeWidth={2} aria-hidden="true" />
        </span>
      </span>
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
