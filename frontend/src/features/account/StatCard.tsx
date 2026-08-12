import type { LucideIcon } from "lucide-react"
import { formatInr } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number
  description?: string
  /** "accent" (gold, default) for neutral/primary figures, "success" (green) for positive/credit figures. */
  tone?: "accent" | "success"
  /** "currency" (default, ₹ formatted) or "count" (plain integer, e.g. a transaction count). */
  format?: "currency" | "count"
  loading?: boolean
}

/**
 * Icon + label + amount + short description tile — the one wallet/summary
 * card shape reused across Account Overview (balances) and Transaction
 * History (aggregate counts). Values are always passed in from real
 * query data by the caller, never fabricated here.
 */
export function StatCard({ icon: Icon, label, value, description, tone = "accent", format = "currency", loading }: StatCardProps) {
  const iconColor = tone === "success" ? "var(--acc-success)" : "var(--acc-accent)"
  const iconBg = tone === "success" ? "var(--acc-success-bg)" : "var(--acc-accent-soft)"

  return (
    <div className="flex flex-col gap-3.5 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5">
      <span
        aria-hidden="true"
        className="flex size-13 items-center justify-center rounded-full"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon className="size-7.5" aria-hidden="true" strokeWidth={2.1} />
      </span>
      <div>
        <p className="text-base text-[color:var(--acc-text-secondary)]">{label}</p>
        {loading ? (
          <span className="mt-1.5 inline-block h-8 w-28 animate-pulse rounded bg-[color:var(--acc-border)]" aria-label={`Loading ${label}`} />
        ) : (
          <p className="text-[28px] leading-tight font-bold text-[color:var(--acc-text-primary)]">
            {format === "currency" ? formatInr(value) : value.toLocaleString("en-IN")}
          </p>
        )}
      </div>
      {description && <p className="text-sm text-[color:var(--acc-text-secondary)]">{description}</p>}
    </div>
  )
}
