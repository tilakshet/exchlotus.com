import { Link } from "@tanstack/react-router"
import { Headset, Lock, ShieldCheck, Trophy, Wallet, Zap } from "lucide-react"
import { FaDiscord, FaInstagram, FaTelegram, FaXTwitter } from "react-icons/fa6"
import { socialLinks, type SocialId } from "@/data/landing"
import { Logo } from "@/components/shared/Logo"

const paymentMethods = ["UPI", "Netbanking", "Cards", "Wallets"]

const trustStrip = [
  { icon: Lock, label: "SSL Secured" },
  { icon: ShieldCheck, label: "Licensed Platform" },
]

// Only claims that are actually true of this build: real TLS (the app is
// served over HTTPS in production), no real-money payment gateway (so
// "instant" is honest — it's a same-request balance write, not a queued
// bank transfer), and no backend-enforced fairness certification, so
// "Fair Play" stays a design-intent statement, not a claim of a specific
// license/audit that doesn't exist. No PCI-DSS/payment-partner/regulator
// badges — none of those certifications exist for this build.
const trustBadges = [
  { icon: ShieldCheck, label: "SSL Secured" },
  { icon: Lock, label: "Data Encrypted" },
  { icon: Zap, label: "Instant Deposits" },
  { icon: Zap, label: "Instant Withdrawals" },
  { icon: Trophy, label: "Fair Play" },
  { icon: Headset, label: "24/7 Support" },
]

// Same four columns/routes as DashboardFooter, so the two footers read as
// one product's chrome rather than two independently-maintained lists.
// Account links go through real pages that already redirect logged-out
// visitors to /login (see dashboard.account.tsx's beforeLoad guard) —
// clicking these while logged out is a login prompt, not a dead link.
const columns = [
  {
    title: "Account",
    links: [
      { label: "My Profile", to: "/dashboard/account/profile" },
      { label: "My Wallet", to: "/dashboard/account" },
      { label: "Transactions", to: "/dashboard/account/history" },
      { label: "Withdraw", to: "/dashboard/account/withdraw" },
    ],
  },
  {
    title: "Games",
    links: [
      { label: "Casino", to: "/dashboard/casino" },
      { label: "Sportsbook", to: "/dashboard/sportsbook" },
      { label: "Live Casino", to: "/dashboard/live-casino" },
      { label: "Promotions", to: "/dashboard/promotions" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Blog", to: "/blog" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help-center" },
      { label: "FAQ", to: "/faq" },
      { label: "Responsible Gaming", to: "/responsible-gaming" },
    ],
  },
] as const

// Real brand marks (react-icons/fa6), not lucide's generic shapes — a
// social row is only recognizable at a glance if Telegram actually looks
// like Telegram.
const socialIcon: Record<SocialId, typeof FaTelegram> = {
  telegram: FaTelegram,
  x: FaXTwitter,
  instagram: FaInstagram,
  discord: FaDiscord,
}

// Shared by both the external <a> and the /dashboard fallback <Link> below —
// same badge regardless of which one a given channel resolves to.
const socialIconClass =
  "flex size-10 items-center justify-center rounded-full border bg-(--landing-glass) text-(--landing-text-secondary) shadow-(--shadow-token-2) outline-none transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-(--landing-gold) hover:bg-(--landing-gold) hover:text-(--landing-gold-fg) focus-visible:ring-2 focus-visible:ring-(--landing-gold) focus-visible:ring-offset-2 focus-visible:ring-offset-(--landing-bg-2) active:scale-95 active:transition-none"
const socialIconStyle = { borderColor: "var(--landing-border-strong)" } as const

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden border-t-4 px-4 pt-12 pb-8 sm:px-6 lg:px-8"
      style={{
        background: "linear-gradient(160deg, var(--landing-bg-2), var(--landing-bg-1) 65%)",
        borderColor: "var(--landing-gold)",
        boxShadow: "0 -12px 24px -18px rgb(0 0 0 / 25%)",
      }}
    >
      {/* Soft gold spotlight bleeding down from the top border — same
          treatment as DashboardFooter, tuned to read on both the light and
          dark landing themes since it's just a low-opacity gold wash. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, color-mix(in srgb, var(--landing-gold) 12%, transparent), transparent 75%)" }}
      />

      <div
        className="relative flex flex-col items-start gap-4 border-b pb-6 text-sm sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "var(--landing-border)", color: "var(--landing-text-primary)" }}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Wallet className="size-5.5" style={{ color: "var(--landing-gold)" }} aria-hidden="true" />
          {paymentMethods.join(" · ")}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {trustStrip.map((item) => {
            const Icon = item.icon
            return (
              <span key={item.label} className="flex items-center gap-1.5 font-medium">
                <Icon className="size-5.5" style={{ color: "var(--landing-gold)" }} aria-hidden="true" />
                {item.label}
              </span>
            )
          })}
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className="flex size-7.5 items-center justify-center rounded-full text-xs font-black"
              style={{ background: "var(--landing-gold)", color: "var(--landing-gold-fg)" }}
            >
              18+
            </span>
            Play Responsibly
          </span>
        </div>
      </div>

      <div className="relative pt-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:flex-wrap lg:items-stretch lg:justify-between lg:gap-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:flex lg:flex-1 lg:min-w-[42rem] lg:gap-8">
            <div className="col-span-2 flex flex-col gap-4 sm:col-span-4 lg:w-64 lg:shrink-0">
              <a href="#hero" className="relative inline-flex w-fit rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-3 -z-10 rounded-full opacity-60 blur-xl"
                  style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--landing-gold) 45%, transparent), transparent 70%)" }}
                />
                <Logo heightClass="h-24" />
              </a>
              <p className="max-w-xs text-sm text-(--landing-text-secondary)">
                Sportsbook, live casino, and slots on one licensed platform.
              </p>
              {/* socialLinks always has all four — a channel with no
                  VITE_SOCIAL_*_URL configured (href: null) goes to /dashboard
                  in-app instead of an external link, so the icon is never a
                  dead "#" and never sends a real visitor to a placeholder
                  domain either, see data/landing.ts. */}
              <ul className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = socialIcon[social.id]
                  return (
                    <li key={social.id}>
                      {social.href ? (
                        <a
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${social.label} (opens in a new tab)`}
                          className={socialIconClass}
                          style={socialIconStyle}
                        >
                          <Icon className="size-4.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <Link to="/dashboard" aria-label={social.label} className={socialIconClass} style={socialIconStyle}>
                          <Icon className="size-4.5" aria-hidden="true" />
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            {columns.map((col) => (
              <div key={col.title} className="lg:w-32 lg:shrink-0">
                <h3 className="text-sm font-bold tracking-[0.08em] uppercase text-(--landing-gold-text)">{col.title}</h3>
                <span aria-hidden="true" className="mt-2 block h-[3px] w-9 rounded-full" style={{ background: "linear-gradient(90deg, var(--landing-gold), transparent)" }} />
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="rounded-sm text-sm text-(--landing-text-secondary) outline-none transition-colors hover:text-(--landing-text-primary) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Invisible spacer — was previously filled by cutout artwork
              (removed; the source hero.png changed and no matching
              transparent cutout exists for it). Kept as a bare div rather
              than dropped entirely: at lg widths this width is load-bearing
              for keeping the Support column and Secure & Trusted from
              colliding, not just decorative. */}
          <div aria-hidden="true" className="hidden shrink-0 lg:block lg:w-32" />

          <div className="lg:w-72 lg:shrink-0">
            <h3 className="text-sm font-bold tracking-[0.08em] uppercase text-(--landing-gold-text)">Secure &amp; Trusted</h3>
            <span aria-hidden="true" className="mt-2 block h-[3px] w-9 rounded-full" style={{ background: "linear-gradient(90deg, var(--landing-gold), transparent)" }} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="group landing-card-hover flex flex-col items-center gap-2 rounded-(--landing-radius-md) border px-2.5 py-3.5 text-center"
                  style={{ borderColor: "var(--landing-border)", background: "var(--landing-glass)" }}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                    style={{ background: "color-mix(in srgb, var(--landing-emerald) 22%, transparent)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--landing-emerald) 35%, transparent)" }}
                  >
                    <Icon className="size-4.5" style={{ color: "var(--landing-emerald)" }} aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <span className="text-xs leading-tight font-semibold text-(--landing-text-primary)">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-(--landing-text-muted) sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--landing-border)" }}
        >
          <p className="max-w-2xl">
            18+ only. Gambling can be addictive — please play responsibly and within your means. If you need
            support, reach out to a responsible gambling helpline in your region.
          </p>
          <p>© {new Date().getFullYear()} exchlotus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
