import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertTriangle, Clock, KeyRound, LifeBuoy, ShieldCheck, Wallet } from "lucide-react"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { Card } from "@/components/landing/shared/Card"

export const Route = createFileRoute("/responsible-gaming")({
  component: ResponsibleGamingPage,
})

const limitTips = [
  { icon: Wallet, title: "Set a Budget Limit", description: "Decide what you can afford to spend before you start, and stick to it — treat it as an entertainment cost, not an investment." },
  { icon: Clock, title: "Set a Time Limit", description: "Give yourself a fixed session length and step away when it's up, win or lose." },
  { icon: LifeBuoy, title: "Take Breaks", description: "Regular breaks keep play in perspective and help you make clearer decisions." },
  { icon: AlertTriangle, title: "Avoid Chasing Losses", description: "Trying to win back losses by playing more usually leads to bigger losses. If you're down, stop for the day." },
] as const

const warningSigns = [
  "Spending more time or money than you planned to",
  "Playing to escape stress, sadness, or other problems",
  "Borrowing money or using funds meant for essentials to play",
  "Feeling irritable or anxious when you try to cut back",
  "Hiding how much you play from family or friends",
] as const

const accountSafety = [
  { icon: KeyRound, title: "Use a Strong Password", description: "Choose a unique password for EXCHLOTUS that you don't reuse elsewhere." },
  { icon: ShieldCheck, title: "Never Share Your OTP or Password", description: "EXCHLOTUS will never ask for your OTP or password over phone, chat, or email. Anyone who does is not us." },
  { icon: LifeBuoy, title: "Log Out on Shared Devices", description: "Always log out of your account on public or shared computers and phones." },
] as const

function ResponsibleGamingPage() {
  return (
    <InfoPageLayout>
      <PageHero eyebrow="Responsible Gaming" title="Responsible Gaming" subtitle="Play for entertainment. Stay in control." />

      <SectionContainer ariaLabel="Play responsibly">
        <SectionHeading eyebrow="Our approach" title="Play Responsibly" center />
        <p className="mx-auto mt-6 max-w-3xl text-center text-base text-(--landing-text-secondary) sm:text-lg">
          Gaming on EXCHLOTUS is meant to be entertainment — not a way to make money or solve financial problems. We want every
          player to enjoy the platform within limits that work for their own life and budget.
        </p>
      </SectionContainer>

      <SectionContainer className="bg-(--landing-bg-2)" ariaLabel="Set your limits">
        <SectionHeading eyebrow="Stay in control" title="Set Your Limits" center />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {limitTips.map(({ icon: Icon, title, description }) => (
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

      <SectionContainer ariaLabel="Know when to stop">
        <SectionHeading eyebrow="Recognize the signs" title="Know When to Stop" center />
        <Card className="mx-auto mt-8 max-w-2xl">
          <ul className="flex flex-col gap-3">
            {warningSigns.map((sign) => (
              <li key={sign} className="flex items-start gap-3 text-sm text-(--landing-text-secondary)">
                <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-(--landing-gold-text)" aria-hidden="true" />
                {sign}
              </li>
            ))}
          </ul>
        </Card>
      </SectionContainer>

      <SectionContainer className="bg-(--landing-bg-2)" ariaLabel="Protect your account">
        <SectionHeading eyebrow="Security" title="Protect Your Account" center />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {accountSafety.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-(--landing-radius-md) bg-(--landing-gold)/15">
                <Icon className="size-6 text-(--landing-gold-text)" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-(--landing-text-primary)">{title}</h3>
              <p className="text-sm text-(--landing-text-secondary)">{description}</p>
            </Card>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer ariaLabel="Need help" className="text-center">
        <SectionHeading eyebrow="We're here" title="Need Help?" center />
        <p className="mx-auto mt-4 max-w-2xl text-(--landing-text-secondary)">
          If gaming stops feeling like entertainment, reach out to our support team, or speak with a responsible-gambling
          helpline in your region for confidential support.
        </p>
        <Link
          to="/contact"
          className="landing-glow mt-7 inline-flex rounded-(--landing-radius-full) bg-(--landing-gold) px-8 py-3.5 text-sm font-black text-(--landing-gold-fg) outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
        >
          Contact Support
        </Link>
      </SectionContainer>
    </InfoPageLayout>
  )
}
