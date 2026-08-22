import { createFileRoute, Outlet } from "@tanstack/react-router"

// Pure layout — TanStack Router nests /kyc/$id under this route by file
// naming convention (dot-segments = parent/child), so without this Outlet
// the detail page has nowhere to render and silently never appears. Same
// split as _authenticated.users.tsx: the actual list page lives at
// _authenticated.kyc.index.tsx (exact /kyc only, not a wrapper for /kyc/$id).
export const Route = createFileRoute("/_authenticated/kyc")({
  component: () => <Outlet />,
})
