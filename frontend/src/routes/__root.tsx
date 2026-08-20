import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useSocketConnection } from "@/services/socket.service"
import { useIdleLogout } from "@/hooks/useIdleLogout"

/**
 * Minimal shell — chrome (nav/skip-link) lives per-layout now, not globally:
 * the dashboard layout (dashboard.tsx) has its own dark-teal/gold navbar +
 * sidebar + betslip shell, the landing page (index.tsx) and login route have
 * their own dark-premium header. Auth/UI state lives in the Redux store
 * (src/store), wired at the app root in main.tsx, not here — this only
 * opens the real-time socket connection and the 10-minute inactivity
 * timeout once for the whole app.
 */
export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  useSocketConnection()
  useIdleLogout()
  return <Outlet />
}
