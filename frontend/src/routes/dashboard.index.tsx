import { createFileRoute } from "@tanstack/react-router"
import { HeroCarousel } from "@/components/HeroCarousel/HeroCarousel"
import { CategoryGameRows } from "@/features/games/CategoryGameRows"
import { FavoritesRow } from "@/features/games/FavoritesRow"
import { TrendingGamesRow } from "@/features/games/TrendingGamesRow"
import { RecentBigWinsRow } from "@/features/wins/RecentBigWinsRow"
import { useAuth } from "@/hooks/useAuth"

export const Route = createFileRoute("/dashboard/")({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 sm:-mx-6">
        <HeroCarousel compact />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[color:var(--sb-text-primary)]">
          {user ? `Welcome back, ${user.username}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--sb-text-secondary)]">Browse featured sections and jump into a game.</p>
      </div>

      <RecentBigWinsRow />

      <TrendingGamesRow />

      <FavoritesRow />

      <CategoryGameRows />
    </div>
  )
}
