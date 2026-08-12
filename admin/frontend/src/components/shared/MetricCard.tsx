import type { LucideIcon } from "lucide-react"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MetricTrend {
  changePct: number
  tone?: "positive" | "negative" | "neutral"
  label?: string
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  trend?: MetricTrend
}) {
  const direction = trend ? (trend.changePct > 0 ? "up" : trend.changePct < 0 ? "down" : "flat") : null
  const TrendIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus
  const trendTone =
    trend?.tone === "positive" ? "text-success" : trend?.tone === "negative" ? "text-destructive" : "text-muted-foreground"

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendTone)}>
            <TrendIcon className="size-3.5" aria-hidden="true" />
            {Math.abs(trend.changePct).toFixed(1)}%
          </span>
        )}
      </div>
      {(hint || trend?.label) && <p className="text-xs text-muted-foreground">{trend?.label ?? hint}</p>}
    </div>
  )
}
