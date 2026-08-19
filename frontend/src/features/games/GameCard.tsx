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
 * Used whenever a game has no banner art to fall back on. Each gradient
 * runs from one of the theme's two dark navy card tones into one of its
 * two accents (green/purple) — no colors outside the theme's palette.
 */
const categoryArt: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  slots: { icon: Dices, from: "#131C2A", to: "#357f0f" },
  "live-casino": { icon: Spade, from: "#021A2A", to: "#761386" },
  "crash-games": { icon: Rocket, from: "#131C2A", to: "#761386" },
  "table-games": { icon: Gem, from: "#021A2A", to: "#357f0f" },
}
const fallbackArt = { icon: Dices, from: "#131C2A", to: "#021A2A" }

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
    <div className="group flex flex-col gap-1 sm:gap-1.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--sb-radius-md)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[color:var(--sb-accent-gold)]/40 group-hover:shadow-[0_18px_36px_-20px_rgba(0,0,0,.55)] sm:rounded-[var(--sb-radius-lg)]">
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
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1.5 sm:gap-2 sm:p-3"
            style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
          >
            <ArtIcon className="absolute inset-0 m-auto size-10 text-white/10 sm:size-20" aria-hidden="true" strokeWidth={1.5} />
            <span
              className="relative flex size-6 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xs font-black text-white backdrop-blur-sm sm:size-11 sm:text-lg"
              aria-hidden="true"
            >
              {game.gameName.charAt(0)}
            </span>
            <p className="relative hidden max-w-full truncate px-2 text-center text-sm font-bold text-white sm:block">{game.gameName}</p>
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
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-[color:var(--sb-accent-gold-fg)] shadow-[0_8px_24px_-6px_rgba(0,0,0,.6)] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
              style={{ background: "var(--sb-accent-gold)" }}
            >
              <Play className="size-3.5 fill-current sm:size-6" aria-hidden="true" />
              <span className="hidden sm:inline">Play</span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(game.gameId)}
          aria-pressed={favorited}
          aria-label={favorited ? `Remove ${game.gameName} from favorites` : `Add ${game.gameName} to favorites`}
          className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/45 outline-none backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] sm:right-3 sm:top-3 sm:size-9"
        >
          <Heart className={`size-3 sm:size-4.5 ${favorited ? "fill-red-500 text-red-500" : "text-white"}`} aria-hidden="true" />
        </button>
      </div>

      {/* Simulated social-proof indicator, not a real live count — see
          useLivePlayingCount.ts. aria-hidden: decorative flourish, not
          information a screen reader user needs. */}
      <p className="flex items-center gap-1 px-0.5 text-[10px] font-semibold sm:gap-1.5 sm:text-xs" aria-hidden="true">
        <span className="relative flex size-1.5 sm:size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color:var(--brand-green-text)] opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--brand-green-text)] sm:size-2" />
        </span>
        <span style={{ color: "var(--sb-text-primary)" }}>{playingCount.toLocaleString()}</span>
        <span style={{ color: "var(--sb-text-secondary)" }}>Playing</span>
      </p>
    </div>
  )
}
