import { ArrowUpFromLine, Gamepad2, UserPlus, Wallet } from "lucide-react"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { Card } from "@/components/landing/shared/Card"

const steps = [
  { icon: UserPlus, step: "1", title: "Sign Up", description: "Create your account with just a phone number — verified by OTP, no paperwork." },
  { icon: Wallet, step: "2", title: "Deposit", description: "Add funds to your wallet securely. Your balance updates instantly." },
  { icon: Gamepad2, step: "3", title: "Play", description: "Choose from sportsbook, live casino, and slots — all in one catalog." },
  { icon: ArrowUpFromLine, step: "4", title: "Withdraw", description: "Cash out your withdrawable balance whenever you want, no waiting." },
] as const

export function HowItWorksSection() {
  return (
    <SectionContainer id="how-it-works" ariaLabel="How it works">
      <SectionHeading eyebrow="Getting started" title="How It Works" description="From sign-up to your first withdrawal, in four steps." center />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, step, title, description }) => (
          <Card key={step} className="relative flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="absolute right-4 top-4 text-3xl font-black text-(--landing-text-primary)/[0.06]"
            >
              {step}
            </span>
            <span className="flex size-14 items-center justify-center rounded-full bg-(--landing-emerald)/15 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Icon className="size-7 text-(--landing-emerald)" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-(--landing-text-primary)">{title}</h3>
            <p className="text-sm text-(--landing-text-secondary)">{description}</p>
          </Card>
        ))}
      </div>
    </SectionContainer>
  )
}
