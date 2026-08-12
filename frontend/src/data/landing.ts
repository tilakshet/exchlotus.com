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

export const socialLinks = [
  { id: "telegram", label: "Telegram", href: "#" },
  { id: "x", label: "X", href: "#" },
  { id: "instagram", label: "Instagram", href: "#" },
  { id: "discord", label: "Discord", href: "#" },
]
