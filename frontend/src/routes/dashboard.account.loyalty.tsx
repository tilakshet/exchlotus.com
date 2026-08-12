import { createFileRoute, Link } from "@tanstack/react-router"
import { Check, Lock, Star } from "lucide-react"
import { CURRENT_LOYALTY_POINTS, CURRENT_LOYALTY_TIER, LOYALTY_TIERS, type LoyaltyTier } from "@/features/account/loyalty-tiers"

export const Route = createFileRoute("/dashboard/account/loyalty")({
  component: LoyaltyPage,
})

function formatPoints(n: number) {
  return n >= 100_000 ? `${n / 100_000}L` : n.toLocaleString("en-IN")
}

function TierStars({ count }: { count: number }) {
  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <Star key={i} className="size-6.5" aria-hidden="true" fill={i < count ? "var(--acc-star)" : "none"} stroke={i < count ? "var(--acc-star)" : "var(--acc-star-empty)"} />
      ))}
    </div>
  )
}

function TierRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-[color:var(--acc-border-soft)] py-3 text-base first:border-t-0">
      <span className="text-[color:var(--acc-text-secondary)]">{label}</span>
      <span className="font-semibold text-[color:var(--acc-text-primary)]">{value}</span>
    </div>
  )
}

/**
 * Journey strip above the tier cards — a chevron/step indicator showing all
 * 4 real program tiers with the current one highlighted, so the "you are
 * here" progression reads at a glance before scrolling into the cards.
 */
function LevelJourney({ tiers, currentName }: { tiers: LoyaltyTier[]; currentName: string }) {
  const currentIndex = tiers.findIndex((t) => t.name === currentName)
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5">
      {tiers.map((tier, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <div key={tier.name} className="flex shrink-0 items-center gap-1.5">
            <div className="flex flex-col items-center gap-2 px-3">
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-full text-base font-bold"
                style={
                  isCurrent
                    ? { background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }
                    : isDone
                      ? { background: "var(--acc-success-bg)", color: "var(--acc-success-fg)" }
                      : { background: "var(--acc-border-soft)", color: "var(--acc-text-secondary)" }
                }
              >
                {isDone ? <Check className="size-5.5" aria-hidden="true" strokeWidth={2.3} /> : index + 1}
              </span>
              <span
                className="whitespace-nowrap text-sm font-semibold"
                style={{ color: isCurrent ? "var(--acc-accent)" : "var(--acc-text-secondary)" }}
              >
                {tier.name}
              </span>
            </div>
            {index < tiers.length - 1 && <span aria-hidden="true" className="h-px w-12 shrink-0" style={{ background: isDone ? "var(--acc-success)" : "var(--acc-border)" }} />}
          </div>
        )
      })}
    </div>
  )
}

function CurrentTierCard({ tier }: { tier: LoyaltyTier }) {
  const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.findIndex((t) => t.name === tier.name) + 1]
  const target = tier.pointsTo ?? tier.pointsFrom
  const progressPct = target > 0 ? Math.min(100, (CURRENT_LOYALTY_POINTS / target) * 100) : 100

  return (
    <div className="w-full overflow-hidden rounded-[var(--acc-radius-lg)] border-2 bg-[color:var(--acc-surface)]" style={{ borderColor: "var(--acc-accent)" }}>
      <div className="px-5 py-7 text-center" style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}>
        <span aria-hidden="true" className="mx-auto flex size-18 items-center justify-center rounded-full" style={{ background: "rgb(255 255 255 / 25%)" }}>
          <Star className="size-9" fill="currentColor" aria-hidden="true" />
        </span>
        <TierStars count={tier.stars} />
        <p className="mt-2.5 text-sm font-bold uppercase tracking-wide opacity-90">Current Tier</p>
      </div>
      <div className="p-5">
        <p className="mb-2 flex items-center justify-between text-lg font-bold text-[color:var(--acc-text-primary)]">{tier.name}</p>
        <TierRow label="Points" value={`${formatPoints(tier.pointsFrom)} - ${tier.pointsTo ? formatPoints(tier.pointsTo) : "Above"}`} />
        <TierRow label="CashBack" value={`${tier.cashbackPct}%`} />
        <TierRow label="Deposit Bonus" value={`${tier.depositBonusPct}%`} />
        <TierRow label="Free Withdrawals" value={String(tier.freeWithdrawals)} />

        {nextTier && (
          <>
            <p className="mt-4 text-center text-sm text-[color:var(--acc-text-secondary)]">
              {formatPoints(target - CURRENT_LOYALTY_POINTS)} Points more needed to reach {nextTier.name}!
            </p>
            <div className="mt-2.5 h-3 overflow-hidden rounded-full" style={{ background: "var(--acc-border-soft)" }}>
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--acc-success), var(--acc-accent))" }} />
            </div>
          </>
        )}

        <Link
          to="/dashboard/account/deposit"
          className="mt-5 block rounded-[var(--acc-radius-md)] py-3.5 text-center text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
          style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
        >
          Deposit Now
        </Link>
      </div>
    </div>
  )
}

function LockedTierCard({ tier }: { tier: LoyaltyTier }) {
  return (
    <div className="w-full rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)]">
      <div className="px-5 py-7 text-center">
        <span aria-hidden="true" className="mx-auto flex size-18 items-center justify-center rounded-full" style={{ background: "var(--acc-accent-soft)" }}>
          <Star className="size-9" style={{ color: "var(--acc-accent)" }} fill="var(--acc-accent)" aria-hidden="true" />
        </span>
        <TierStars count={tier.stars} />
      </div>
      <div className="relative p-5">
        <p className="mb-2 text-lg font-bold text-[color:var(--acc-text-primary)]">{tier.name}</p>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-11 bottom-18 flex items-center justify-center">
          <Lock className="size-11 text-[color:var(--acc-text-secondary)] opacity-40" aria-hidden="true" />
        </div>
        <div className="opacity-30 blur-[1px]">
          <TierRow label="Points" value={`${formatPoints(tier.pointsFrom)} - ${tier.pointsTo ? formatPoints(tier.pointsTo) : "Above"}`} />
          <TierRow label="CashBack" value={`${tier.cashbackPct}%`} />
          <TierRow label="Deposit Bonus" value={`${tier.depositBonusPct}%`} />
          <TierRow label="Free Withdrawals" value={String(tier.freeWithdrawals)} />
        </div>
        <Link
          to="/dashboard/account/deposit"
          className="mt-5 block rounded-[var(--acc-radius-md)] py-3.5 text-center text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
          style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
        >
          Deposit Now
        </Link>
      </div>
    </div>
  )
}

/**
 * Static program content — there's no VIP/loyalty backend module yet (no
 * accrual tracking of deposit volume into points). Every account shows
 * Silver / 0 points, an honest "not tracked yet" default rather than
 * fabricated progress. See features/account/loyalty-tiers.ts.
 */
function LoyaltyPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-[color:var(--acc-text-secondary)]">
        Loyalty tiers reflect the program's real rules. Point tracking from deposits isn't live yet — every account starts at Silver.
      </p>
      <LevelJourney tiers={LOYALTY_TIERS} currentName={CURRENT_LOYALTY_TIER.name} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {LOYALTY_TIERS.map((tier) => (tier.name === CURRENT_LOYALTY_TIER.name ? <CurrentTierCard key={tier.name} tier={tier} /> : <LockedTierCard key={tier.name} tier={tier} />))}
      </div>
    </div>
  )
}
