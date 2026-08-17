import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Circle,
  Clock,
  Dices,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trophy,
  XCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

type Tone = VariantProps<typeof badgeVariants>["variant"]

interface StatusConfig {
  label: string
  tone: Tone
  icon: LucideIcon
}

export const USER_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Active", tone: "success", icon: CheckCircle2 },
  SUSPENDED: { label: "Suspended", tone: "destructive", icon: XCircle },
}

export const ADMIN_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Active", tone: "success", icon: CheckCircle2 },
  DISABLED: { label: "Disabled", tone: "destructive", icon: XCircle },
}

export const WITHDRAWAL_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: { label: "Pending review", tone: "warning", icon: Clock },
  APPROVED: { label: "Approved", tone: "success", icon: CheckCircle2 },
  PROCESSING: { label: "Processing", tone: "default", icon: Loader2 },
  PAID: { label: "Paid", tone: "success", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", tone: "destructive", icon: XCircle },
  FAILED: { label: "Failed", tone: "destructive", icon: XCircle },
}

export const MFA_STATUS_CONFIG: Record<string, StatusConfig> = {
  true: { label: "MFA enabled", tone: "success", icon: ShieldCheck },
  false: { label: "MFA not set up", tone: "warning", icon: ShieldAlert },
}

export const LEDGER_TYPE_CONFIG: Record<string, StatusConfig> = {
  DEPOSIT: { label: "Deposit", tone: "success", icon: ArrowDownToLine },
  WITHDRAWAL: { label: "Withdrawal", tone: "warning", icon: ArrowUpFromLine },
  BET: { label: "Bet", tone: "default", icon: Dices },
  WIN: { label: "Win", tone: "success", icon: Trophy },
  REFUND: { label: "Refund", tone: "warning", icon: RotateCcw },
  ADJUSTMENT: { label: "Adjustment", tone: "default", icon: Sliders },
}

/**
 * Never color-only (master spec §29 — accessibility): every status pairs an
 * icon + text label with the semantic color, so meaning survives for
 * colorblind users or a bad monitor, not just the tint.
 */
export function StatusBadge({ config, status }: { config: Record<string, StatusConfig>; status: string }) {
  const entry = config[status] ?? { label: status, tone: "default" as Tone, icon: Circle }
  const Icon = entry.icon
  return (
    <Badge variant={entry.tone}>
      <Icon className="size-3" aria-hidden="true" />
      {entry.label}
    </Badge>
  )
}
