import { Link } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

export interface BottomNavItem {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

/**
 * Mobile-only (<1024px) primary navigation — replaces the old MobileNav
 * drawer. Three call sites share this component (dashboard.tsx for the main
 * sections, dashboard.account.tsx for the account sections, and the public
 * landing page's routes/index.tsx) — the two dashboard ones are mutually
 * exclusive by route, never both mounted at once, see each layout's own
 * comment for how it decides which bar (if any) to render. Active state
 * comes from Link's own `data-status` attribute — same mechanism
 * Sidebar.tsx already relies on, no separate route-matching logic here.
 *
 * Floating pill with the active item's icon raised into its own gold badge
 * that pokes above the bar's top edge (design reference: a "notched" bottom
 * bar) — the ring around that badge is colored to match the bar's own
 * background rather than an actual clip-path/mask cutout, which fakes the
 * notch convincingly without needing per-item cutout geometry. No drawn
 * "home indicator" grabber bar below it, unlike the reference — that's
 * mockup chrome standing in for the OS's own gesture bar; drawing a second,
 * fake one under a real device's real one would look like a rendering bug.
 */
export function BottomNavBar({ items }: { items: BottomNavItem[] }) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-6 lg:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <nav
        aria-label="Main"
        className="flex items-stretch gap-1 overflow-visible rounded-[var(--sb-radius-full)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] px-2 py-2 shadow-[0_14px_32px_-10px_rgb(0_0_0/35%)] backdrop-blur-xl"
      >
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--sb-radius-full)] px-1 py-1 text-[11px] font-semibold text-[color:var(--sb-text-secondary)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] data-[status=active]:text-[color:var(--sb-accent-gold)]"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full transition-all duration-300 ease-out group-data-[status=active]:-translate-y-[18px] group-data-[status=active]:scale-110 group-data-[status=active]:bg-[color:var(--sb-accent-gold)] group-data-[status=active]:shadow-[0_8px_18px_-4px_var(--sb-accent-gold)] group-data-[status=active]:ring-[5px] group-data-[status=active]:ring-[color:var(--sb-content-bg)]"
            >
              <item.icon
                className="size-5.5 shrink-0 transition-colors duration-300 group-data-[status=active]:text-[color:var(--sb-accent-gold-fg)]"
                aria-hidden="true"
              />
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
