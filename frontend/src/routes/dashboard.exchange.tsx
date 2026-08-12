import { createFileRoute } from "@tanstack/react-router"
import { SectionPlaceholder } from "@/components/dashboard/SectionPlaceholder"

export const Route = createFileRoute("/dashboard/exchange")({
  component: () => <SectionPlaceholder title="Exchange" />,
})
