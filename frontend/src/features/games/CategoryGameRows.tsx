import { useState } from "react"
import { useHomeFeed } from "@/hooks/useCategories"
import { CategoryRowView, CategoryRowSkeleton } from "./CategoryRow"
import { GameLaunchModalConnected } from "./GameLaunchModalConnected"
import type { Game, HomeFeedShelf } from "@/types/catalog"

const DASHBOARD_GAME_SECTIONS: { code: string; name: string; categoryCodes: string[] }[] = [
  { code: "quick-games", name: "Quick Games", categoryCodes: ["dice", "instantgame", "interactivegame", "keno", "lottery", "lotto", "plinko", "scratchcards", "bingo", "hi-lo"] },
  { code: "crash-games", name: "Crash Games", categoryCodes: ["crashgame"] },
  { code: "card-games", name: "Card Games", categoryCodes: ["cards", "poker", "blackjack", "baccarat", "teenpatti", "andarbahar", "dragontiger"] },
  { code: "slots", name: "Slots", categoryCodes: ["slot", "slots"] },
]

function collectGames(shelves: HomeFeedShelf[], categoryCodes: string[]): Game[] {
  const codes = new Set(categoryCodes)
  const games = new Map<string, Game>()
  for (const shelf of shelves) {
    for (const game of shelf.games) {
      if (game.category?.code && codes.has(game.category.code)) games.set(game.gameId, game)
    }
  }
  return [...games.values()].slice(0, 12)
}

/** Dashboard Home discovery shelves, using the same order as the public landing page. */
export function CategoryGameRows() {
  const { data: shelves, isLoading, isError, refetch } = useHomeFeed()
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  return (
    <div className="flex flex-col gap-8">
      {isLoading && DASHBOARD_GAME_SECTIONS.map((section) => <CategoryRowSkeleton key={section.code} />)}

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          Couldn't load games.
          <button type="button" onClick={() => refetch()} className="font-medium underline">Retry</button>
        </div>
      )}

      {!isLoading && !isError && shelves && DASHBOARD_GAME_SECTIONS.map((section) => (
        <CategoryRowView
          key={section.code}
          code={section.code}
          name={section.name}
          games={collectGames(shelves, section.categoryCodes)}
          onPlay={setLaunchingGame}
        />
      ))}

      {launchingGame && <GameLaunchModalConnected game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
