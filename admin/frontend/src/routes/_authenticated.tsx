import { createFileRoute, redirect } from "@tanstack/react-router"
import { store } from "@/store"
import { AppShell } from "@/components/shell/AppShell"

// Runs outside React (beforeLoad), so it reads the Redux store directly
// rather than through useAdminAuth() — every route under this layout
// (dashboard, users, admins, roles, audit) is gated here in one place.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    if (!store.getState().adminAuth.user) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } })
    }
  },
  component: AppShell,
})
