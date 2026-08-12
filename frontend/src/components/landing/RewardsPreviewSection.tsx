import { Star } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { Card } from "@/components/landing/shared/Card"
import { LOYALTY_TIERS } from "@/features/account/loyalty-tiers"

/** Real tier rules from the loyalty program definition — same data the authenticated Loyalty page renders, not a marketing-only fabrication. */
export function RewardsPreviewSection() {
  return (
    <SectionContainer id="rewards" ariaLabel="Rewards and loyalty" className="bg-(--landing-bg-2)">
      <SectionHeading eyebrow="Play more, earn more" title="Rewards & Loyalty" description="Every deposit moves you up a tier — with real cashback, deposit bonuses, and free withdrawals." center />
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {LOYALTY_TIERS.map((tier) => (
          <Card key={tier.name} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-(--landing-text-primary)">{tier.name}</h3>
              <div className="flex gap-0.5" aria-label={`${tier.stars} stars`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4"
                    aria-hidden="true"
                    fill={i < tier.stars ? "var(--landing-gold)" : "none"}
                    stroke={i < tier.stars ? "var(--landing-gold)" : "var(--landing-text-muted)"}
                  />
                ))}
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm text-(--landing-text-secondary)">
              <li>{tier.cashbackPct}% cashback</li>
              <li>{tier.depositBonusPct}% deposit bonus</li>
              <li>{tier.freeWithdrawals === "Unlimited" ? "Unlimited" : tier.freeWithdrawals} free withdrawals</li>
            </ul>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-(--landing-text-secondary)">
        <Link to="/login" search={{ view: "otp" }} className="font-bold text-(--landing-gold-text) underline underline-offset-2">
          Log in
        </Link>{" "}
        to track your tier and points.
      </p>
    </SectionContainer>
  )
}
