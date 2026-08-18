import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Dices, Gem, Heart, Play, Rocket, Spade, type LucideIcon } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useFavorites } from "@/hooks/useFavorites"
import { useLivePlayingCount } from "@/hooks/useLivePlayingCount"
import type { Game } from "@/types/catalog"

/**
 * One visual treatment per category, not a hash — a real design decision
 * (slots feel different from crash games) rather than arbitrary variety.
 * Used whenever a game has no banner art to fall back on.
 */
const categoryArt: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  slots: { icon: Dices, from: "#7c5a1e", to: "#e8b754" },
  "live-casino": { icon: Spade, from: "#122b0c", to: "#2e7d1f" },
  "crash-games": { icon: Rocket, from: "#5a3d00", to: "#d4af37" },
  "table-games": { icon: Gem, from: "#1c2e24", to: "#58b947" },
}
const fallbackArt = { icon: Dices, from: "#1b2420", to: "#3a4a42" }

/**
 * Real banner art (450x345 from the provider — a 4:3-ish landscape) already
 * has the game's name baked into the artwork, so the card just shows the
 * image full-bleed at its native-ish aspect ratio — no separate title/
 * provider caption layered on top. The fallback (no banner, or the image
 * failed to load) has no artwork to rely on, so that path keeps a name
 * label; everything else is identical between the two.
 */
export function GameCard({ game, onPlay }: { game: Game; onPlay: (game: Game) => void }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [imgFailed, setImgFailed] = useState(false)
  const favorited = isFavorite(game.gameId)
  const art = (game.category?.code && categoryArt[game.category.code]) || fallbackArt
  const ArtIcon = art.icon
  const hasBanner = !!game.bannerUrl && !imgFailed
  const playingCount = useLivePlayingCount(game.gameId)

  function handlePlay() {
    if (!isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/dashboard" } })
      return
    }
    onPlay(game)
  }

  return (
    <div className="group flex flex-col gap-1.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[color:var(--sb-accent-gold)]/40 group-hover:shadow-[0_18px_36px_-20px_rgba(0,0,0,.55)]">
        {hasBanner ? (
          <img
            src={game.bannerUrl!}
            alt={game.gameName}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3"
            style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
          >
            <ArtIcon className="absolute inset-0 m-auto size-20 text-white/10" aria-hidden="true" strokeWidth={1.5} />
            <span
              className="relative flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-black text-white backdrop-blur-sm"
              aria-hidden="true"
            >
              {game.gameName.charAt(0)}
            </span>
            <p className="relative max-w-full truncate px-2 text-center text-sm font-bold text-white">{game.gameName}</p>
          </div>
        )}

        {/* The whole card is the play trigger — image already carries the
            name, so there's no separate footer control to tap. The favorite
            button below is a sibling, not nested inside this, so it stays
            independently clickable above it (see z-10). */}
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${game.gameName}`}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--sb-accent-gold)]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <span
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[color:var(--sb-accent-gold-fg)] shadow-[0_8px_24px_-6px_rgba(0,0,0,.6)]"
              style={{ background: "var(--sb-accent-gold)" }}
            >
              <Play className="size-6 fill-current" aria-hidden="true" />
              Play
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(game.gameId)}
          aria-pressed={favorited}
          aria-label={favorited ? `Remove ${game.gameName} from favorites` : `Add ${game.gameName} to favorites`}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/45 outline-none backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
        >
          <Heart className={`size-4.5 ${favorited ? "fill-red-500 text-red-500" : "text-white"}`} aria-hidden="true" />
        </button>
      </div>

      {/* Simulated social-proof indicator, not a real live count — see
          useLivePlayingCount.ts. aria-hidden: decorative flourish, not
          information a screen reader user needs. */}
      <p className="flex items-center gap-1.5 px-0.5 text-xs font-semibold" aria-hidden="true">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span style={{ color: "var(--sb-text-primary)" }}>{playingCount.toLocaleString()}</span>
        <span style={{ color: "var(--sb-text-secondary)" }}>Playing</span>
      </p>
    </div>
  )
}
