import { createFileRoute, Outlet } from "@tanstack/react-router"

// Pure layout — same reasoning as _authenticated.users.tsx: TanStack Router
// nests /referrals/$id under this route by file naming convention, so
// without this Outlet the detail page has nowhere to render.
export const Route = createFileRoute("/_authenticated/referrals")({
  component: () => <Outlet />,
})
