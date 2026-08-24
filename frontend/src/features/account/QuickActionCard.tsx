import type { LucideIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

interface QuickActionCardProps {
  to: string
  icon: LucideIcon
  label: string
  /** "primary" (gold fill, default) for the money-moving actions (Deposit/Withdraw), "secondary" (outlined) for the rest. */
  variant?: "primary" | "secondary"
}

/** Large-icon action tile for the Account Overview quick-actions row. */
export function QuickActionCard({ to, icon: Icon, label, variant = "secondary" }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[var(--acc-radius-lg)] border px-3 py-4.5 text-center text-sm font-medium outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
      style={
        variant === "primary"
          ? { background: "var(--acc-accent)", borderColor: "var(--acc-accent)", color: "var(--acc-accent-fg)" }
          : { borderColor: "var(--acc-border)", color: "var(--acc-text-primary)", background: "var(--acc-surface)" }
      }
    >
      <Icon className="size-6.5" aria-hidden="true" strokeWidth={2} />
      {label}
    </Link>
  )
}
