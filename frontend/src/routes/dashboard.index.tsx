import { createFileRoute } from "@tanstack/react-router"
import { HeroCarousel } from "@/components/HeroCarousel/HeroCarousel"
import { ProviderLogoCarousel } from "@/components/shared/ProviderLogoCarousel"
import { CategoryGameRows } from "@/features/games/CategoryGameRows"
import { FavoritesRow } from "@/features/games/FavoritesRow"
import { TrendingGamesRow } from "@/features/games/TrendingGamesRow"
import { RecentBigWinsRow } from "@/features/wins/RecentBigWinsRow"

export const Route = createFileRoute("/dashboard/")({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 sm:-mx-6">
        <HeroCarousel compact />
      </div>

      <ProviderLogoCarousel />

      <RecentBigWinsRow />

      <TrendingGamesRow />

      <FavoritesRow />

      <CategoryGameRows />
    </div>
  )
}
