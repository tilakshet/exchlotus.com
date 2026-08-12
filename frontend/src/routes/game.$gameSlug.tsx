import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Play } from "lucide-react"
import { useGameBySlug } from "@/hooks/useGames"
import { GameLaunchModal } from "@/features/games/GameLaunchModal"
import type { Game } from "@/types/catalog"

export const Route = createFileRoute("/game/$gameSlug")({
  component: GamePage,
})

function GamePage() {
  const { gameSlug } = Route.useParams()
  const gameQuery = useGameBySlug(gameSlug)
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)
  const game = gameQuery.data

  return (
    <main className="dashboard-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sb-text-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]">
          <ArrowLeft className="size-5.5" aria-hidden="true" />
          Back to lobby
        </Link>

        {gameQuery.isLoading && (
          <div className="mt-8 h-[420px] animate-pulse rounded-[24px] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]" />
        )}

        {gameQuery.isError && (
          <div role="alert" className="mt-8 rounded-[20px] border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Could not load game details.
            <button type="button" onClick={() => gameQuery.refetch()} className="ml-3 font-bold underline">
              Retry
            </button>
          </div>
        )}

        {!gameQuery.isLoading && !gameQuery.isError && !game && (
          <div className="mt-8 rounded-[20px] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] p-8 text-center">
            <h1 className="text-2xl font-black text-[color:var(--sb-text-primary)]">Game not found</h1>
            <p className="mt-2 text-sm text-[color:var(--sb-text-secondary)]">This game is no longer available in the current catalog.</p>
          </div>
        )}

        {game && (
          <section className="mt-8 overflow-hidden rounded-[24px] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]">
            <div className="relative h-[360px] bg-(--brand-showcase-bg-1)">
              {game.bannerUrl && <img src={game.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,23,18,.95),rgba(14,23,18,.34))]" />
              <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end p-8">
                <p className="text-sm font-black uppercase text-[color:var(--sb-accent-gold)]">{game.provider.name}</p>
                <h1 className="mt-2 text-4xl font-black text-[color:var(--sb-text-primary)]">{game.gameName}</h1>
                <p className="mt-3 text-sm text-[color:var(--sb-text-secondary)]">
                  {game.category?.name ?? "Premium game"} {game.rtp ? `with ${game.rtp}% RTP` : "from a certified provider"}.
                </p>
                <button
                  type="button"
                  onClick={() => setLaunchingGame(game)}
                  className="mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-[14px] bg-[color:var(--sb-accent-gold)] px-5 text-sm font-black text-[color:var(--sb-accent-gold-fg)] outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="size-6.5" aria-hidden="true" />
                  Launch Game
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
      {launchingGame && <GameLaunchModal game={launchingGame} onClose={() => setLaunchingGame(null)} />}
    </main>
  )
}
