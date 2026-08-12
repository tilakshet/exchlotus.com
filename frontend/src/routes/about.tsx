import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Compass,
  Gamepad2,
  Gift,
  Headset,
  Lightbulb,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { Card } from "@/components/landing/shared/Card"

export const Route = createFileRoute("/about")({
  component: AboutPage,
})

const offerings = [
  { icon: Gamepad2, title: "Games", description: "Slots, live casino, and sportsbook titles from real, licensed providers in one catalog." },
  { icon: Trophy, title: "Tournaments", description: "Leaderboards and competitive play across our most popular game categories." },
  { icon: Gift, title: "Rewards", description: "Loyalty tiers and promotions that reward regular, responsible play." },
  { icon: Wallet, title: "Wallet", description: "One wallet balance across every game and provider — no juggling multiple accounts." },
  { icon: Lock, title: "Secure Payments", description: "Deposits and withdrawals backed by encrypted transactions and full audit trails." },
  { icon: Headset, title: "Fast Support", description: "A help center, FAQ, and direct contact channel whenever you need a hand." },
] as const

const whyUs = [
  { icon: ShieldCheck, title: "Secure", description: "Encrypted sessions and audited wallet transactions protect every account." },
  { icon: ScrollText, title: "Fair", description: "Every game runs on our providers' certified engines — no house-side tampering." },
  { icon: Zap, title: "Fast", description: "Instant in-app balance updates on deposits, withdrawals, and settlements." },
  { icon: Users, title: "Trusted", description: "Built for players who want a straightforward, transparent platform." },
  { icon: Compass, title: "User-Focused", description: "Every feature — wallet, rewards, support — is designed around real player needs." },
] as const

const values = [
  { icon: ShieldCheck, title: "Integrity", description: "We say what we do and do what we say — no dark patterns, no hidden terms." },
  { icon: Lock, title: "Security", description: "Player data and funds are protected with industry-standard safeguards." },
  { icon: ScrollText, title: "Fairness", description: "Every player gets the same odds, the same rules, the same experience." },
  { icon: Lightbulb, title: "Innovation", description: "We keep improving the product based on how players actually use it." },
  { icon: Sparkles, title: "Responsible Gaming", description: "Entertainment first — we build tools that help players stay in control." },
] as const

function AboutPage() {
  return (
    <InfoPageLayout>
      <PageHero
        eyebrow="About EXCHLOTUS"
        title="About EXCHLOTUS"
        subtitle="Play. Win. Repeat."
        description="EXCHLOTUS is a modern gaming and rewards platform built around fair play, security, and a genuinely enjoyable player experience."
      />

      <SectionContainer ariaLabel="Who we are">
        <SectionHeading eyebrow="Our story" title="Who We Are" center />
        <p className="mx-auto mt-6 max-w-3xl text-center text-base text-(--landing-text-secondary) sm:text-lg">
          EXCHLOTUS brings sportsbook, live casino, and slots together on a single platform with one wallet, one login, and one
          consistent experience. We partner with real game providers rather than building fixtures of our own, so what you play is
          exactly what's on the tin. Our focus is entertainment — a place players can enjoy games, track their wallet, and unlock
          rewards without friction.
        </p>
      </SectionContainer>

      <SectionContainer className="bg-(--landing-bg-2)" ariaLabel="Our mission">
        <SectionHeading
          eyebrow="What drives us"
          title="Our Mission"
          description="Building a platform that's entertaining first, and responsible, secure, and user-friendly by design."
          center
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { icon: Sparkles, label: "Entertainment" },
            { icon: ScrollText, label: "Fair Play" },
            { icon: Lock, label: "Secure Experience" },
            { icon: Users, label: "User-Friendly Gaming" },
            { icon: ShieldCheck, label: "Responsible Participation" },
          ].map(({ icon: Icon, label }) => (
            <Card key={label} className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-(--landing-gold)/15">
                <Icon className="size-7 text-(--landing-gold-text)" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-(--landing-text-primary)">{label}</span>
            </Card>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer ariaLabel="What we offer">
        <SectionHeading eyebrow="On the platform" title="What We Offer" center />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-(--landing-radius-md) bg-(--landing-emerald)/15">
                <Icon className="size-6 text-(--landing-emerald)" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-(--landing-text-primary)">{title}</h3>
              <p className="text-sm text-(--landing-text-secondary)">{description}</p>
            </Card>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="bg-(--landing-bg-2)" ariaLabel="Why EXCHLOTUS">
        <SectionHeading eyebrow="The difference" title="Why EXCHLOTUS" center />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {whyUs.map(({ icon: Icon, title, description }) => (
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

      <SectionContainer ariaLabel="Our values">
        <SectionHeading eyebrow="What we stand for" title="Our Values" center />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {values.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-(--landing-emerald)/15">
                <Icon className="size-7 text-(--landing-emerald)" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-(--landing-text-primary)">{title}</h3>
              <p className="text-sm text-(--landing-text-secondary)">{description}</p>
            </Card>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="text-center" ariaLabel="Explore games">
        <h2 className="text-2xl font-black text-(--landing-text-primary) sm:text-3xl">Ready to play?</h2>
        <p className="mx-auto mt-3 max-w-xl text-(--landing-text-secondary)">
          Browse the full catalog and see what EXCHLOTUS has to offer.
        </p>
        <Link
          to="/"
          hash="trending"
          className="landing-glow mt-7 inline-flex rounded-(--landing-radius-full) bg-(--landing-gold) px-8 py-3.5 text-sm font-black text-(--landing-gold-fg) outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
        >
          Explore Games
        </Link>
      </SectionContainer>
    </InfoPageLayout>
  )
}
