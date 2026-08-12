import { Link } from "@tanstack/react-router"
import { ShieldHalf } from "lucide-react"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"

export function ResponsibleGamingPreviewSection() {
  return (
    <SectionContainer id="responsible-gaming" ariaLabel="Responsible gaming" className="bg-(--landing-bg-2)">
      <div className="landing-card mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-(--landing-radius-lg) p-8 text-center sm:p-10">
        <span className="flex size-14 items-center justify-center rounded-full bg-(--landing-gold)/15">
          <ShieldHalf className="size-7 text-(--landing-gold-text)" aria-hidden="true" />
        </span>
        <h2 className="text-2xl font-black text-(--landing-text-primary) sm:text-3xl">Play for entertainment. Stay in control.</h2>
        <p className="max-w-xl text-(--landing-text-secondary)">
          EXCHLOTUS is built for fun, not financial pressure. Set your own limits, take breaks, and know when to stop.
        </p>
        <Link
          to="/responsible-gaming"
          className="mt-2 rounded-(--landing-radius-full) border border-(--landing-border-strong) px-6 py-2.5 text-sm font-bold text-(--landing-text-primary) outline-none transition-colors hover:border-(--landing-gold) hover:text-(--landing-gold-text) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
        >
          Learn more about Responsible Gaming
        </Link>
      </div>
    </SectionContainer>
  )
}
