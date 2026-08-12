import { createFileRoute } from "@tanstack/react-router"
import { Briefcase, Compass, Handshake, Lightbulb, Rocket, Send, TrendingUp } from "lucide-react"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { Card } from "@/components/landing/shared/Card"

export const Route = createFileRoute("/careers")({
  component: CareersPage,
})

const perks = [
  { icon: TrendingUp, title: "Growth", description: "Real ownership over features, not just tickets — your work ships and matters." },
  { icon: Lightbulb, title: "Learning", description: "Work across the full stack of a live gaming platform: wallet, providers, realtime." },
  { icon: Rocket, title: "Innovation", description: "We ship fast and iterate on real player feedback, not committee sign-off." },
  { icon: Handshake, title: "Collaboration", description: "A small, direct team — no layers between an idea and shipping it." },
  { icon: Compass, title: "Impact", description: "Every hire meaningfully shapes the product at this stage of the company." },
] as const

function CareersPage() {
  return (
    <InfoPageLayout>
      <PageHero
        eyebrow="Careers"
        title="Build the Future of Gaming with EXCHLOTUS"
        description="We're building a modern gaming and rewards platform, and we're looking for people who want to help shape it."
      />

      <SectionContainer ariaLabel="Why work with us">
        <SectionHeading eyebrow="Life at EXCHLOTUS" title="Why Work With Us" center />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {perks.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-(--landing-gold)/15">
                <Icon className="size-7 text-(--landing-gold-text)" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-(--landing-text-primary)">{title}</h3>
              <p className="text-sm text-(--landing-text-secondary)">{description}</p>
            </Card>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="bg-(--landing-bg-2)" ariaLabel="Open positions">
        <SectionHeading eyebrow="Join the team" title="Open Positions" center />
        <div className="mx-auto mt-10 max-w-2xl">
          <Card className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-(--landing-emerald)/15">
              <Briefcase className="size-8 text-(--landing-emerald)" aria-hidden="true" />
            </span>
            <h3 className="text-xl font-bold text-(--landing-text-primary)">We don't have any open positions right now.</h3>
            <p className="max-w-md text-sm text-(--landing-text-secondary)">
              That changes fast — send us your resume and we'll reach out when a role fits.
            </p>
            <a
              href="mailto:careers@exchlotus.com?subject=Resume%20Submission"
              className="landing-glow mt-2 inline-flex items-center gap-2 rounded-(--landing-radius-full) bg-(--landing-gold) px-7 py-3 text-sm font-black text-(--landing-gold-fg) outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
            >
              <Send className="size-4.5" aria-hidden="true" />
              Send Your Resume
            </a>
          </Card>
        </div>
      </SectionContainer>
    </InfoPageLayout>
  )
}
