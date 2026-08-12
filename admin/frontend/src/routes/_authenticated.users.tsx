import { createFileRoute, Outlet } from "@tanstack/react-router"

// Pure layout — TanStack Router nests /users/$id under this route by file
// naming convention (dot-segments = parent/child), so without this Outlet
// the detail page has nowhere to render and silently never appears. The
// actual Users list page lives at _authenticated.users.index.tsx (renders
// only at the exact /users path, not as a wrapper for /users/$id too).
export const Route = createFileRoute("/_authenticated/users")({
  component: () => <Outlet />,
})
