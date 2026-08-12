import { createFileRoute } from "@tanstack/react-router"
import { ProvidersPage } from "@/features/providers/ProvidersPage"

export const Route = createFileRoute("/dashboard/providers")({
  component: ProvidersPage,
})
