import { createFileRoute } from "@tanstack/react-router"
import { Gamepad2, Gift, Megaphone, Newspaper, Sparkles } from "lucide-react"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { Card } from "@/components/landing/shared/Card"

export const Route = createFileRoute("/blog")({
  component: BlogPage,
})

const categories = [
  { icon: Gamepad2, label: "Gaming" },
  { icon: Megaphone, label: "Platform Updates" },
  { icon: Gift, label: "Rewards" },
  { icon: Sparkles, label: "Tips" },
  { icon: Newspaper, label: "News" },
] as const

/**
 * There's no blog backend/CMS wired up yet, so this intentionally shows a
 * real empty state instead of fabricated dated articles — the categories
 * below are the shape a future `GET /api/v1/blog/posts` response would
 * group by, ready to swap in once that endpoint exists.
 */
function BlogPage() {
  return (
    <InfoPageLayout>
      <PageHero eyebrow="Blog" title="EXCHLOTUS Blog" description="Gaming insights, updates, tips and platform news." />

      <SectionContainer ariaLabel="Blog categories">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-2 rounded-(--landing-radius-full) border border-(--landing-border-strong) bg-(--landing-bg-2) px-4 py-2 text-sm font-bold text-(--landing-text-primary)"
            >
              <Icon className="size-4.5 text-(--landing-gold-text)" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <Card className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-(--landing-gold)/15">
              <Newspaper className="size-8 text-(--landing-gold-text)" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-bold text-(--landing-text-primary)">Our blog is launching soon.</h2>
            <p className="max-w-md text-sm text-(--landing-text-secondary)">
              We're working on gaming insights, platform updates, and rewards tips. Check back soon for our first posts.
            </p>
          </Card>
        </div>
      </SectionContainer>
    </InfoPageLayout>
  )
}
