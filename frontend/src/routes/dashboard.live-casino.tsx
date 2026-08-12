import { createFileRoute } from "@tanstack/react-router"
import { CategoryHubPage } from "@/features/games/CategoryHubPage"

export const Route = createFileRoute("/dashboard/live-casino")({
  component: () => <CategoryHubPage group="live-casino" title="Live Casino" />,
})
