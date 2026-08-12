import { useMemo, useState } from "react"
import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router"
import { ArrowRight, Gamepad2, Gift, Headset, Search, UserRound, Wallet } from "lucide-react"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { Card } from "@/components/landing/shared/Card"

export const Route = createFileRoute("/help-center")({
  component: HelpCenterPage,
})

interface HelpTopic {
  label: string
  to: LinkProps["to"]
}

const helpCategories: { icon: typeof UserRound; title: string; topics: HelpTopic[] }[] = [
  {
    icon: UserRound,
    title: "Account",
    topics: [
      { label: "Profile", to: "/dashboard/account/profile" },
      { label: "Login", to: "/login" },
      { label: "Password", to: "/login" },
      { label: "Security", to: "/faq" },
    ],
  },
  {
    icon: Wallet,
    title: "Wallet & Payments",
    topics: [
      { label: "Deposit", to: "/dashboard/account/deposit" },
      { label: "Withdraw", to: "/dashboard/account/withdraw" },
      { label: "Payment Methods", to: "/dashboard/account/deposit" },
      { label: "Transactions", to: "/dashboard/account/history" },
    ],
  },
  {
    icon: Gamepad2,
    title: "Games",
    topics: [
      { label: "How to Play", to: "/faq" },
      { label: "Game Rules", to: "/faq" },
      { label: "Tournaments", to: "/dashboard/promotions" },
      { label: "Results", to: "/dashboard/account/history" },
    ],
  },
  {
    icon: Gift,
    title: "Rewards",
    topics: [
      { label: "Loyalty", to: "/dashboard/account/loyalty" },
      { label: "Bonuses", to: "/dashboard/promotions" },
      { label: "Rewards", to: "/dashboard/account/loyalty" },
      { label: "Promotions", to: "/dashboard/promotions" },
    ],
  },
  {
    icon: Headset,
    title: "Support",
    topics: [
      { label: "Contact Support", to: "/contact" },
      { label: "Account Issues", to: "/contact" },
      { label: "Payment Issues", to: "/contact" },
    ],
  },
]

function HelpCenterPage() {
  const [query, setQuery] = useState("")

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return helpCategories
    return helpCategories
      .map((category) => ({
        ...category,
        topics: category.topics.filter((topic) => topic.label.toLowerCase().includes(q) || category.title.toLowerCase().includes(q)),
      }))
      .filter((category) => category.topics.length > 0)
  }, [query])

  return (
    <InfoPageLayout>
      <PageHero eyebrow="Help Center" title="How can we help you?">
        <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-(--landing-radius-full) border border-(--landing-border-strong) bg-(--landing-bg-2) px-5 py-3.5 shadow-token-2">
          <Search className="size-5.5 shrink-0 text-(--landing-text-muted)" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for help..."
            aria-label="Search for help"
            className="w-full bg-transparent text-sm text-(--landing-text-primary) outline-none placeholder:text-(--landing-text-muted) sm:text-base"
          />
        </div>
      </PageHero>

      <SectionContainer ariaLabel="Help categories">
        {filteredCategories.length === 0 ? (
          <p className="text-center text-sm text-(--landing-text-secondary)">
            No results for "{query}". Try a different search or{" "}
            <Link to="/contact" className="underline underline-offset-2">
              contact support
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map(({ icon: Icon, title, topics }) => (
              <Card key={title} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-(--landing-radius-md) bg-(--landing-gold)/15">
                    <Icon className="size-6 text-(--landing-gold-text)" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold text-(--landing-text-primary)">{title}</h3>
                </div>
                <ul className="flex flex-col gap-1">
                  {topics.map((topic) => (
                    <li key={topic.label}>
                      <Link
                        to={topic.to}
                        className="group flex items-center justify-between gap-2 rounded-(--landing-radius-sm) px-2 py-2 text-sm text-(--landing-text-secondary) outline-none transition-colors hover:bg-(--landing-hover-tint) hover:text-(--landing-text-primary) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                      >
                        {topic.label}
                        <ArrowRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </SectionContainer>
    </InfoPageLayout>
  )
}
