import { Headset, Lock, ShieldCheck, Trophy, Zap } from "lucide-react"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"

// Same real, verifiable claims as DashboardFooter's trustBadges — real TLS,
// no house-side tampering with provider-certified game engines, and a
// same-request wallet write (not a payment-gateway promise). No
// PCI-DSS/regulator badges — none of those certifications exist for this build.
const badges = [
  { icon: Lock, label: "SSL Secured" },
  { icon: ShieldCheck, label: "Data Encrypted" },
  { icon: Zap, label: "Instant Deposits" },
  { icon: Zap, label: "Instant Withdrawals" },
  { icon: Trophy, label: "Fair Play" },
  { icon: Headset, label: "24/7 Support" },
] as const

export function SecurityTrustSection() {
  return (
    <SectionContainer id="security" ariaLabel="Security and trust">
      <SectionHeading eyebrow="Play with confidence" title="Security & Trust" center />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {badges.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="landing-card landing-card-hover group flex flex-col items-center gap-3 rounded-(--landing-radius-lg) px-3 py-6 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-(--landing-emerald)/15 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Icon className="size-6 text-(--landing-emerald)" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold text-(--landing-text-primary)">{label}</span>
          </div>
        ))}
      </div>
    </SectionContainer>
  )
}
