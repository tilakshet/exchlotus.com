import { createFileRoute, Link, Outlet, redirect, useMatchRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { ArrowDownLeft, ArrowUpRight, Briefcase, Gift, History as HistoryIcon, LifeBuoy, LogOut, ShieldCheck, Star, User } from "lucide-react"
import { store } from "@/store"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { BottomNavBar } from "@/components/dashboard-shell/BottomNavBar"
import { CURRENT_LOYALTY_TIER } from "@/features/account/loyalty-tiers"

/**
 * Layout for the whole /dashboard/account/* tree — on desktop, a left
 * sidebar (avatar + tier stars, Loyalty/Account/History/My Profile nav,
 * Log Out) plus a top pill-tab bar (Account/Deposit/Withdraw/Loyalty/
 * History). Uses the same `--sb-*` dashboard-shell palette as the rest of
 * /dashboard (via the `--acc-*` aliases in index.css), so this reads as
 * one product with the shell above it rather than a visually separate
 * section bolted on. The whole tree is a full-width dashboard layout
 * (sidebar + flexible main column, capped at a generous max-width on very
 * large screens) — no page inside should re-narrow itself to a fixed
 * small column.
 *
 * Below `lg:`, both the sidebar and pill-tab bar are hidden in favor of
 * this section's own BottomNavBar (topTabs + Profile) — see
 * accountBottomNavItems below and BottomNavBar.tsx.
 *
 * Desktop is a true two-pane split, not just a page that happens to scroll
 * with a sticky sidebar: the row is height-bound to the visible viewport
 * (100dvh minus the measured TopNavbar height + the shared dashboard
 * <main>'s own vertical padding — see index.css/dashboard.tsx, both fixed
 * quantities, not guesses), so the sidebar spans the full screen and a
 * vertical divider separates it from a main pane that scrolls on its own
 * (`lg:overflow-y-auto`) independently of the sidebar. `lg:sticky` on the
 * row is a safety net, not the primary mechanism — if the measured offset
 * is ever slightly off, the pane still stays pinned instead of scrolling
 * away with the page. Below `lg:` this collapses back to normal stacked,
 * page-scrolls flow (no fixed heights, no independent scroll regions) —
 * a split pane doesn't fit a phone-width viewport.
 */
export const Route = createFileRoute("/dashboard/account")({
  // Wallet/deposit/withdraw/profile/history all live under this one layout
  // route, so gating it here protects all of them at once — this is the
  // check dashboard.tsx's own comment flagged as missing ("not access-gated
  // ... this is where that check would live once real auth exists"). Reads
  // the store directly (not useAuth()) since beforeLoad runs outside React.
  beforeLoad: ({ location }) => {
    if (!store.getState().auth.user) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } })
    }
  },
  component: AccountLayout,
})

const sideNav = [
  { to: "/dashboard/account/loyalty", label: "Loyalty", icon: Gift, exact: false },
  { to: "/dashboard/account", label: "Account", icon: Briefcase, exact: true },
  { to: "/dashboard/account/history", label: "History", icon: HistoryIcon, exact: false },
  { to: "/dashboard/account/profile", label: "My Profile", icon: User, exact: false },
  { to: "/dashboard/account/kyc", label: "KYC Verification", icon: ShieldCheck, exact: false },
] as const

const topTabs = [
  { to: "/dashboard/account", label: "Account", icon: Briefcase, exact: true },
  { to: "/dashboard/account/deposit", label: "Deposit", icon: ArrowDownLeft, exact: false },
  { to: "/dashboard/account/withdraw", label: "Withdraw", icon: ArrowUpRight, exact: false },
  { to: "/dashboard/account/loyalty", label: "Loyalty", icon: Gift, exact: false },
  { to: "/dashboard/account/history", label: "History", icon: HistoryIcon, exact: false },
] as const

// Mobile bottom bar for this section — topTabs plus Profile and Support,
// which are otherwise only reachable via the sidebar (hidden on mobile
// below, see AccountLayout) — without this they'd have no mobile entry
// point at all.
const accountBottomNavItems = [
  ...topTabs,
  { to: "/dashboard/account/support", label: "Support", icon: LifeBuoy, exact: false },
  { to: "/dashboard/account/profile", label: "Profile", icon: User, exact: false },
]

const pageHeadings: { match: string; exact: boolean; title: string; subtitle: string }[] = [
  { match: "/dashboard/account/add-bank", exact: false, title: "Add Bank Account", subtitle: "Save a payout method for withdrawals." },
  { match: "/dashboard/account/deposit", exact: false, title: "Deposit", subtitle: "Add money securely to your wallet." },
  { match: "/dashboard/account/withdraw", exact: false, title: "Withdraw", subtitle: "Move your withdrawable balance out instantly." },
  { match: "/dashboard/account/loyalty", exact: false, title: "Loyalty", subtitle: "Track your tier, rewards and progress." },
  { match: "/dashboard/account/history", exact: false, title: "Transaction History", subtitle: "Every deposit, withdrawal and game transaction on your account." },
  { match: "/dashboard/account/support", exact: false, title: "Support", subtitle: "Raise a query and track your conversation with our team." },
  { match: "/dashboard/account/profile", exact: false, title: "My Profile", subtitle: "Manage your personal details and security." },
  { match: "/dashboard/account/kyc", exact: false, title: "KYC Verification", subtitle: "Verify your identity to unlock withdrawals." },
  { match: "/dashboard/account", exact: true, title: "Account", subtitle: "Manage your wallet, deposits, withdrawals and rewards." },
]

function AccountLayout() {
  const { user, logout } = useAuth()
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  async function handleLogout() {
    await logout()
    navigate({ to: "/" })
  }

  const heading = pageHeadings.find((h) => (h.exact ? pathname === h.match : pathname.startsWith(h.match))) ?? pageHeadings[pageHeadings.length - 1]

  return (
    <div className="account-shell flex w-full flex-col gap-6 lg:sticky lg:top-[8px] lg:h-[calc(100dvh-5.5rem)] lg:flex-row lg:items-stretch lg:gap-0 lg:overflow-hidden">
      {/* Hidden on mobile — the account section's own BottomNavBar (rendered
          below) covers the same ground (including Log Out via ProfileChip
          on the navbar), so this doesn't need a stacked-above-content
          mobile fallback the way it might otherwise. */}
      <aside className="hidden lg:flex lg:h-full lg:w-72 lg:shrink-0 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:pr-4">
        <div
          className="shrink-0 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] p-4"
          style={{ background: "linear-gradient(135deg, var(--acc-accent-soft), var(--acc-surface) 70%)" }}
        >
          <div className="flex items-center gap-3">
            <UserAvatar sizeClassName="size-14" background="var(--acc-accent)" color="var(--acc-accent-fg)" gender={profile?.gender} />
            <div>
              <p className="text-sm font-medium text-[color:var(--acc-text-primary)]">{user?.username ?? "Guest"}</p>
              <div className="mt-1 flex gap-0.5" aria-label={`${CURRENT_LOYALTY_TIER.name} tier`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4.5"
                    aria-hidden="true"
                    fill={i < CURRENT_LOYALTY_TIER.stars ? "var(--acc-star)" : "none"}
                    stroke={i < CURRENT_LOYALTY_TIER.stars ? "var(--acc-star)" : "var(--acc-star-empty)"}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nav + Log Out share one bordered panel, Log Out pinned to the
            bottom via mt-auto — this panel stretches to match the main
            column's height (default flex `align-items: stretch` on the row
            below), so Log Out sits at the bottom of the sidebar the way it
            does in the reference mockups, not immediately under the nav. */}
        <div className="flex flex-1 flex-col rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-2.5">
          <nav aria-label="Account sections" className="flex flex-col gap-1">
            {sideNav.map(({ to, label, icon: Icon, exact }) => {
              const active = !!matchRoute({ to, fuzzy: !exact })
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-[var(--acc-radius-md)] px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)] ${
                    active ? "text-[color:var(--acc-accent)]" : "text-[color:var(--acc-text-primary)] hover:bg-[color:var(--acc-bg)]"
                  }`}
                  style={active ? { background: "var(--acc-accent-soft)" } : undefined}
                >
                  <Icon className="size-6.5" aria-hidden="true" strokeWidth={2.1} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto pt-2">
            <div className="mb-2 border-t border-[color:var(--acc-border)]" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-[var(--acc-radius-md)] px-3 py-2.5 text-sm font-medium text-[color:var(--acc-text-secondary)] outline-none transition-colors hover:bg-[color:var(--acc-bg)] hover:text-[color:var(--acc-text-primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
            >
              <LogOut className="size-6.5" aria-hidden="true" strokeWidth={2.1} />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Vertical divider between the sidebar and the scrollable content
          pane — only present at the lg breakpoint where the two panes sit
          side by side; the stacked mobile layout has no need for one. */}
      <div aria-hidden="true" className="hidden shrink-0 lg:block lg:w-px lg:self-stretch" style={{ background: "var(--acc-border)" }} />

      <div className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:pr-2 lg:pl-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold leading-tight text-[color:var(--acc-text-primary)] sm:text-2xl">{heading.title}</h1>
          <p className="mt-1 text-sm text-[color:var(--acc-text-secondary)]">{heading.subtitle}</p>
        </div>

        {/* Desktop only — mobile navigates this section via the BottomNavBar below instead. */}
        <div role="tablist" aria-label="Account, Deposit, Withdraw, Loyalty, or History" className="mb-5 hidden flex-wrap gap-2 lg:flex">
          {topTabs.map(({ to, label, icon: Icon, exact }) => {
            const active = !!matchRoute({ to, fuzzy: !exact })
            return (
              <Link
                key={to}
                to={to}
                role="tab"
                aria-selected={active}
                className="flex h-9 items-center gap-1.5 rounded-[var(--acc-radius-full)] border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
                style={
                  active
                    ? { background: "var(--acc-accent)", borderColor: "var(--acc-accent)", color: "var(--acc-accent-fg)" }
                    : { background: "var(--acc-surface)", borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }
                }
              >
                <Icon className="size-5.5" aria-hidden="true" strokeWidth={2.1} />
                {label}
              </Link>
            )
          })}
        </div>

        <Outlet />
      </div>

      <BottomNavBar items={accountBottomNavItems} />
    </div>
  )
}
