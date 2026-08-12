import { createFileRoute, Link } from "@tanstack/react-router"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { InfoAccordion, type AccordionItemData } from "@/components/landing/shared/Accordion"

export const Route = createFileRoute("/faq")({
  component: FaqPage,
})

const faqCategories: { title: string; items: AccordionItemData[] }[] = [
  {
    title: "General",
    items: [
      {
        id: "general-what-is",
        question: "What is EXCHLOTUS?",
        answer: "EXCHLOTUS is a gaming and rewards platform bringing sportsbook, live casino, and slots together with one wallet and one login.",
      },
      {
        id: "general-devices",
        question: "Which devices can I use EXCHLOTUS on?",
        answer: "EXCHLOTUS runs in any modern desktop or mobile browser — there's no separate app required to play.",
      },
      {
        id: "general-contact",
        question: "How do I contact support?",
        answer: (
          <>
            Visit our{" "}
            <Link to="/contact" className="underline underline-offset-2">
              Contact Us
            </Link>{" "}
            page, or check the{" "}
            <Link to="/help-center" className="underline underline-offset-2">
              Help Center
            </Link>{" "}
            for quick answers.
          </>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        id: "account-create",
        question: "How do I create an account?",
        answer: "Tap Login / Sign Up, enter your mobile number, and verify the OTP sent to it — your account is created automatically on first verification.",
      },
      {
        id: "account-password",
        question: "I forgot my password — what do I do?",
        answer: "Use Login with OTP instead of your password — it verifies your identity via your mobile number without needing the old password.",
      },
      {
        id: "account-profile",
        question: "How do I update my profile details?",
        answer: "Go to My Account → My Profile from the dashboard to update your details.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        id: "payments-deposit",
        question: "How do I deposit funds?",
        answer: "Open your wallet from the dashboard and select Deposit, then follow the on-screen steps to add funds.",
      },
      {
        id: "payments-transactions",
        question: "Where can I see my transactions?",
        answer: "Your full transaction history is available under My Account → Transactions.",
      },
      {
        id: "payments-secure",
        question: "Are my payments secure?",
        answer: "Yes — wallet transactions are processed through encrypted, audited operations, and every change is recorded in your transaction history.",
      },
    ],
  },
  {
    title: "Withdrawals",
    items: [
      {
        id: "withdrawals-how",
        question: "How do I withdraw?",
        answer: "Go to My Account → Withdraw, enter the amount, and confirm — your available wallet balance updates immediately.",
      },
      {
        id: "withdrawals-minimum",
        question: "Is there a minimum withdrawal amount?",
        answer: "Minimums can vary — the Withdraw screen always shows the current limit before you confirm.",
      },
    ],
  },
  {
    title: "Games",
    items: [
      {
        id: "games-catalog",
        question: "Where can I find all the available games?",
        answer: "Browse the full catalog from the homepage or dashboard — you can filter by category and provider.",
      },
      {
        id: "games-fair",
        question: "Are the games fair?",
        answer: "Every game runs on our providers' own certified engines — EXCHLOTUS doesn't alter odds or outcomes.",
      },
    ],
  },
  {
    title: "Rewards",
    items: [
      {
        id: "rewards-how",
        question: "How do rewards work?",
        answer: "Regular play moves you through loyalty tiers, unlocking rewards and promotions — check My Account → Loyalty for your current tier and progress.",
      },
      {
        id: "rewards-promotions",
        question: "Where can I see current promotions?",
        answer: "Visit the Promotions page from the dashboard for all active offers.",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        id: "security-account",
        question: "How can I keep my account secure?",
        answer: "Use a strong, unique password, never share your OTP or login details with anyone, and log out on shared devices.",
      },
      {
        id: "security-otp",
        question: "Will EXCHLOTUS ever ask for my OTP over phone or chat?",
        answer: "No. EXCHLOTUS staff will never ask you to share your OTP or password. Treat any such request as fraudulent.",
      },
    ],
  },
]

function FaqPage() {
  return (
    <InfoPageLayout>
      <PageHero eyebrow="FAQ" title="Frequently Asked Questions" description="Answers to the questions we hear most often." />

      <SectionContainer ariaLabel="FAQ categories">
        <div className="mx-auto flex max-w-3xl flex-col gap-14">
          {faqCategories.map((category) => (
            <div key={category.title}>
              <SectionHeading eyebrow="Category" title={category.title} />
              <div className="mt-6">
                <InfoAccordion items={category.items} />
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
    </InfoPageLayout>
  )
}
