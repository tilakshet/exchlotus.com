import { createFileRoute } from "@tanstack/react-router"
import { CategoryHubPage } from "@/features/games/CategoryHubPage"

export const Route = createFileRoute("/dashboard/casino")({
  component: () => <CategoryHubPage group="casino" title="Casino" />,
})
