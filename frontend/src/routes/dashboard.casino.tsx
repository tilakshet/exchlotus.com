import { createFileRoute } from "@tanstack/react-router"
import { HeroCarousel } from "@/components/HeroCarousel/HeroCarousel"
import { GameCatalogSection } from "@/features/games/GameCatalogSection"

export const Route = createFileRoute("/dashboard/casino")({
  component: () => (
    <div className="flex flex-col gap-6">
      <HeroCarousel compact />
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--sb-text-primary)]">Casino</h1>
        <p className="mt-1 text-sm text-[color:var(--sb-text-secondary)]">Browse casino games by game type or provider.</p>
      </div>
      <GameCatalogSection casinoMode />
    </div>
  ),
})
