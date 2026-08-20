import { createFileRoute, Outlet } from "@tanstack/react-router"

// Layout shell only — the actual list page lives in
// dashboard.account.support.index.tsx (same split as dashboard.account.tsx /
// dashboard.account.index.tsx). Without this Outlet, dashboard.account.support.$id.tsx
// (a file-based child of this route) would match the URL but its component
// would never mount, since TanStack Router renders the matched leaf route
// inside its parent's Outlet — the ticket detail thread silently never
// appeared even though the URL and the ticket list link were both correct.
export const Route = createFileRoute("/dashboard/account/support")({
  component: () => <Outlet />,
})
