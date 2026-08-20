export interface LiveStat {
  id: string
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}

export const liveStats: LiveStat[] = [
  { id: "players", label: "Players Online", value: 48213, suffix: "+" },
  { id: "games", label: "Games Available", value: 6200, suffix: "+" },
  { id: "winners", label: "Daily Winners", value: 3894 },
  { id: "payouts", label: "Total Payouts", value: 128.4, prefix: "₹", suffix: "Cr", decimals: 1 },
  { id: "matches", label: "Live Matches", value: 214 },
]

export type SocialId = "telegram" | "x" | "instagram" | "discord"

interface SocialLink {
  id: SocialId
  label: string
  /** The real profile URL, or null if VITE_SOCIAL_*_URL isn't set for this channel. */
  href: string | null
}

function readSocialUrl(envValue: string | undefined): string | null {
  return envValue && envValue.trim() !== "" ? envValue : null
}

// A channel with no VITE_SOCIAL_*_URL configured keeps its `href: null` —
// LandingFooter.tsx sends it to /dashboard instead of an external link, so
// the icon is never a dead "#" and never sends a real visitor to a generic
// placeholder domain either. Swap in the real values (frontend/.env /
// Dockerfile build args) whenever those accounts exist; no code change
// needed at that point.
export const socialLinks: SocialLink[] = [
  { id: "telegram", label: "Telegram", href: readSocialUrl(import.meta.env.VITE_SOCIAL_TELEGRAM_URL) },
  { id: "x", label: "X", href: readSocialUrl(import.meta.env.VITE_SOCIAL_X_URL) },
  { id: "instagram", label: "Instagram", href: readSocialUrl(import.meta.env.VITE_SOCIAL_INSTAGRAM_URL) },
  { id: "discord", label: "Discord", href: readSocialUrl(import.meta.env.VITE_SOCIAL_DISCORD_URL) },
]
