import { Info } from "lucide-react"

/**
 * Used wherever a mockup shows a feature with no backend yet (coupons,
 * saved bank/crypto payout methods, KYC verification) — an honest inline
 * state instead of a control that pretends to work. See dashboard.account
 * plan: "no fake balance changes, no form that pretends to persist bank
 * details."
 */
export function ComingSoon({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-[var(--acc-radius-sm)] px-3 py-2.5 text-sm"
      style={{ background: "color-mix(in srgb, var(--acc-accent) 8%, transparent)", color: "var(--acc-text-secondary)" }}
    >
      <Info className="mt-0.5 size-4.5 shrink-0" style={{ color: "var(--acc-accent)" }} aria-hidden="true" />
      {message}
    </div>
  )
}
