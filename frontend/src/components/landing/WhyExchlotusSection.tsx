import { Headset, ScrollText, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { Card } from "@/components/landing/shared/Card"

const features = [
  { icon: ShieldCheck, title: "Secure", description: "Encrypted sessions and audited wallet transactions protect every account." },
  { icon: ScrollText, title: "Fair", description: "Every game runs on our providers' certified engines — no house-side tampering." },
  { icon: Zap, title: "Fast", description: "Instant in-app balance updates on deposits, withdrawals, and settlements." },
  { icon: Headset, title: "Supported", description: "A real Help Center, FAQ, and contact channel whenever you need a hand." },
  { icon: Sparkles, title: "Rewarding", description: "Loyalty tiers that reward regular, responsible play — not one-off promos." },
] as const

export function WhyExchlotusSection() {
  return (
    <SectionContainer id="why-exchlotus" ariaLabel="Why EXCHLOTUS" className="bg-(--landing-bg-2)">
      <SectionHeading eyebrow="The difference" title="Why EXCHLOTUS" description="Built around fair play, real security, and a platform you can actually trust." center />
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-(--landing-gold)/15 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Icon className="size-7 text-(--landing-gold-text)" aria-hidden="true" />
            </span>
            <h3 className="text-base font-bold text-(--landing-text-primary)">{title}</h3>
            <p className="text-sm text-(--landing-text-secondary)">{description}</p>
          </Card>
        ))}
      </div>
    </SectionContainer>
  )
}
