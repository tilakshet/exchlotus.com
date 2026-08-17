import { createFileRoute, Outlet } from "@tanstack/react-router"

// Pure layout — same "why this file exists" as _authenticated.users.tsx:
// nests /support/$id under this by file naming convention, so without this
// Outlet the detail page has nowhere to render. The list itself lives at
// _authenticated.support.index.tsx.
export const Route = createFileRoute("/_authenticated/support")({
  component: () => <Outlet />,
})
