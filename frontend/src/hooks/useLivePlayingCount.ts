import { useEffect, useState } from "react"

/**
 * Simulated "N Playing" social-proof counter (the green-dot badge under
 * each GameCard) — there's no real per-game concurrent-session tracking in
 * this backend to source a genuine count from, so this is presentational
 * only, not real telemetry. Seeded per game (via `seed`, typically
 * game.gameId) so the same game shows a consistent baseline across
 * re-renders/reloads instead of jumping to an unrelated number, then
 * jitters by a small random step every second so it reads as "live".
 */
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const MIN_BASELINE = 120
const MAX_BASELINE = 1800
const MAX_DRIFT_RATIO = 0.15
const TICK_MS = 1000

/**
 * A page can render hundreds of GameCards at once (Trending, category
 * shelves, favorites all stacked on Home) — one `setInterval` per card was
 * hundreds of independent per-second re-renders fighting for the main
 * thread simultaneously. This shares a single global ticker across every
 * mounted instance instead: one `setInterval`, started lazily on first
 * subscriber and stopped when the last one unmounts, that just fans a tick
 * out to whichever cards are currently on screen.
 */
const tickListeners = new Set<() => void>()
let tickTimer: ReturnType<typeof setInterval> | null = null

function subscribeTick(listener: () => void): () => void {
  tickListeners.add(listener)
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      for (const l of tickListeners) l()
    }, TICK_MS)
  }
  return () => {
    tickListeners.delete(listener)
    if (tickListeners.size === 0 && tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }
}

export function useLivePlayingCount(seed: string): number {
  const [count, setCount] = useState(() => {
    const baseline = MIN_BASELINE + (hashSeed(seed) % (MAX_BASELINE - MIN_BASELINE))
    return baseline
  })

  useEffect(() => {
    const baseline = MIN_BASELINE + (hashSeed(seed) % (MAX_BASELINE - MIN_BASELINE))
    setCount(baseline)

    return subscribeTick(() => {
      setCount((prev) => {
        const step = Math.floor(Math.random() * 9) - 4 // -4..+4
        const next = prev + step
        const floor = Math.max(MIN_BASELINE, Math.floor(baseline * (1 - MAX_DRIFT_RATIO)))
        const ceil = Math.ceil(baseline * (1 + MAX_DRIFT_RATIO))
        return Math.min(ceil, Math.max(floor, next))
      })
    })
  }, [seed])

  return count
}
