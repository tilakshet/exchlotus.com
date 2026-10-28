import { useState } from "react"
import { useHomeFeed } from "@/hooks/useCategories"
import { GameCard } from "@/features/games/GameCard"
import { GameLaunchModalConnected } from "@/features/games/GameLaunchModalConnected"
import type { Game, HomeFeedShelf } from "@/types/catalog"

const HOME_GAME_SECTIONS: { title: string; categoryCodes: string[] }[] = [
  { title: "Quick Games", categoryCodes: ["dice", "instantgame", "interactivegame", "keno", "lottery", "lotto", "plinko", "scratchcards", "bingo", "hi-lo"] },
  { title: "Crash Games", categoryCodes: ["crashgame"] },
  { title: "Card Games", categoryCodes: ["cards", "poker", "blackjack", "baccarat", "teenpatti", "andarbahar", "dragontiger"] },
  { title: "Slots", categoryCodes: ["slot", "slots"] },
]

export function CategoryRowSkeleton() {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-28 shrink-0 overflow-hidden rounded-(--landing-radius-md) border border-(--landing-border) sm:w-48">
          <div className="aspect-[4/3] animate-pulse bg-(--landing-bg-3)" />
        </div>
      ))}
    </div>
  )
}

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

function GameSection({ title, games, onPlay }: { title: string; games: Game[]; onPlay: (game: Game) => void }) {
  if (games.length === 0) return null
  return (
    <section aria-label={title}>
      <h3 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-(--landing-text-primary)">
        <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, var(--landing-gold-text), transparent)" }} />
        {title}
      </h3>
      <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {games.map((game) => (
          <li key={game.id} className="w-28 shrink-0 sm:w-48">
            <GameCard game={game} onPlay={onPlay} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Landing discovery shelves in a deliberate order, backed by the one-request home feed. */
export function CategoryGameRows() {
  const { data: shelves, isLoading, isError } = useHomeFeed()
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)

  if (isError) return null

  return (
    <div className="flex flex-col gap-8">
      {isLoading && HOME_GAME_SECTIONS.map((section) => <CategoryRowSkeleton key={section.title} />)}
      {!isLoading && shelves && HOME_GAME_SECTIONS.map((section) => (
        <GameSection key={section.title} title={section.title} games={collectGames(shelves, section.categoryCodes)} onPlay={setLaunchingGame} />
      ))}
      {launchingGame && <GameLaunchModalConnected game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </div>
  )
}
