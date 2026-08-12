import { createFileRoute, Outlet } from "@tanstack/react-router"
import { TopNavbar } from "@/components/dashboard-shell/TopNavbar"
import { Sidebar } from "@/components/dashboard-shell/Sidebar"
import { DashboardFooter } from "@/components/dashboard-shell/DashboardFooter"

/**
 * Layout route for the whole /dashboard/* tree: sticky navbar, a fixed
 * (non-scrolling) left rail on desktop (Sidebar, collapses into
 * TopNavbar's MobileNav drawer below 1024px), scrollable main content,
 * footer. Sidebar is `position: fixed` (see Sidebar.tsx), so the
 * `lg:pl-56` below reserves its width in normal flow instead of a flex
 * row — a fixed element doesn't participate in flex sizing. Reachable
 * without a session (browsing is open, same as placing a bet requires
 * login) — not access-gated, but this is where that check would live once
 * real auth exists.
 */
export const Route = createFileRoute("/dashboard")({
    component: DashboardLayout,
})

function DashboardLayout() {
    return (
        <div className="dashboard-shell flex min-h-screen flex-col">
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>
            <TopNavbar />
            <Sidebar />

            <div className="flex flex-1 flex-col lg:pl-56">
                <main id="main-content" className="min-w-0 flex-1 px-4 py-5 sm:px-6">
                    <Outlet />
                </main>

                <DashboardFooter />
            </div>
        </div>
    )
}
