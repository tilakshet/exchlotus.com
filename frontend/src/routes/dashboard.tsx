import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { TopNavbar } from "@/components/dashboard-shell/TopNavbar"
import { Sidebar } from "@/components/dashboard-shell/Sidebar"
import { BottomNavBar } from "@/components/dashboard-shell/BottomNavBar"
import { DashboardFooter } from "@/components/dashboard-shell/DashboardFooter"
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardShell"

/**
 * Layout route for the whole /dashboard/* tree: sticky navbar, a fixed
 * (non-scrolling) left rail on desktop (Sidebar, collapses into a bottom
 * nav bar below 1024px — see BottomNavBar.tsx), scrollable main content,
 * footer. Sidebar is `position: fixed` (see Sidebar.tsx), so the
 * `lg:pl-44` below reserves its width in normal flow instead of a flex
 * row — a fixed element doesn't participate in flex sizing. Reachable
 * without a session (browsing is open, same as placing a bet requires
 * login) — not access-gated, but this is where that check would live once
 * real auth exists.
 */
export const Route = createFileRoute("/dashboard")({
    component: DashboardLayout,
})

function DashboardLayout() {
    // /dashboard/account/* renders its own bottom bar (account-specific
    // sections) — this one only covers everything else, so exactly one bar
    // is ever mounted at a time, never both.
    const inAccountSection = useRouterState({ select: (s) => s.location.pathname.startsWith("/dashboard/account") })

    return (
        <div className="dashboard-shell flex min-h-screen flex-col">
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>
            <TopNavbar />
            <Sidebar />

            <div className="flex flex-1 flex-col lg:pl-44">
                <main id="main-content" className={`min-w-0 flex-1 px-4 py-5 sm:px-6 ${inAccountSection ? "" : "pb-24 lg:pb-5"}`}>
                    <Outlet />
                </main>

                <DashboardFooter />
            </div>

            {!inAccountSection && <BottomNavBar items={DASHBOARD_NAV_ITEMS} />}
        </div>
    )
}
