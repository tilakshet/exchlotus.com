import { Gem, Trophy } from "lucide-react"
import { useRecentBigWinsData, type WinCardData } from "@/hooks/useRecentBigWinsData"

function WinCardSkeleton() {
  return (
    <div className="flex w-32 shrink-0 flex-col gap-1.5">
      <div className="aspect-square animate-pulse rounded-[var(--sb-radius-lg)] bg-[color:var(--sb-content-alt)]" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-[color:var(--sb-content-alt)]" />
    </div>
  )
}

function WinCard({ card }: { card: WinCardData }) {
  return (
    <div className="flex w-32 shrink-0 flex-col gap-1.5">
      <div className="relative aspect-square overflow-hidden rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]">
        {card.image && <img src={card.image} alt="" loading="lazy" className="size-full object-cover" />}
        <span className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 truncate rounded-[var(--sb-radius-full)] bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          <Gem className="size-3 shrink-0 text-[color:var(--sb-accent-gold)]" aria-hidden="true" />
          <span className="truncate">{card.name}</span>
        </span>
      </div>
      <p className="text-sm font-bold text-emerald-400">+₹{card.amount.toLocaleString("en-IN")}</p>
    </div>
  )
}

/**
 * Dashboard's "Recent Big Wins" auto-scrolling ticker (--sb-* tokens). Data
 * logic (real feed vs. dummy per-category fallback) lives in
 * hooks/useRecentBigWinsData.ts, shared with the landing page's version
 * (components/landing/RecentBigWinsRow.tsx) — same behavior on both
 * surfaces, just different tokens/colors. Auto-scrolls via the same
 * `.landing-marquee-x` technique used elsewhere for continuous strips.
 */
export function RecentBigWinsRow() {
  const { cards, isLoading, isError } = useRecentBigWinsData()

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[color:var(--sb-text-primary)]">
        <Trophy className="size-5 text-[color:var(--sb-accent-gold)]" aria-hidden="true" />
        Recent Big Wins
      </h2>

      {isError && <p className="text-sm text-[color:var(--sb-text-secondary)]">Unable to load recent wins.</p>}

      {!isError && isLoading && (
        <div className="scrollbar-none flex gap-3 overflow-x-auto">
          {Array.from({ length: 6 }, (_, i) => (
            <WinCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && cards.length === 0 && (
        <p className="text-sm text-[color:var(--sb-text-secondary)]">No recent big wins yet.</p>
      )}

      {!isError && !isLoading && cards.length > 0 && (
        <div className="overflow-hidden">
          <div className="landing-marquee-x flex w-max gap-3">
            {[...cards, ...cards].map((card, i) => (
              <WinCard key={`${card.id}-${i}`} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
