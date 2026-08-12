import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

/**
 * Credit/debit pill for ledger entries. Ledger rows have no "pending" or
 * "failed" status in the backend (every write is an immediate, settled
 * balance change — see wallet.service.ts), so this only ever distinguishes
 * the two real states: a positive amount (credit, green) or a negative one
 * (debit, neutral). Don't extend this to fabricate a pending/failed state.
 */
export function StatusBadge({ amount }: { amount: number }) {
  const isCredit = amount >= 0
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--acc-radius-full)] px-3 py-1.5 text-sm font-semibold"
      style={
        isCredit
          ? { background: "var(--acc-success-bg)", color: "var(--acc-success-fg)" }
          : { background: "var(--acc-border-soft)", color: "var(--acc-text-secondary)" }
      }
    >
      {isCredit ? <ArrowDownLeft className="size-4.5" aria-hidden="true" strokeWidth={2.3} /> : <ArrowUpRight className="size-4.5" aria-hidden="true" strokeWidth={2.3} />}
      {isCredit ? "Credit" : "Debit"}
    </span>
  )
}
