import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Check, Copy, Gift, Info, Share2, UserPlus, Users, Wallet as WalletIcon } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useProfile } from "@/hooks/useProfile"

export const Route = createFileRoute("/dashboard/refer-earn")({
  component: ReferEarnPage,
})

const steps = [
  { icon: Share2, title: "Share your link", description: "Send your referral link or code to friends however you like — chat, social, anywhere." },
  { icon: UserPlus, title: "They sign up", description: "A friend creates an account using your code. It's recorded on their account right away." },
  { icon: WalletIcon, title: "You both earn", description: "Once referral rewards go live, you'll both see the bonus land automatically — no extra steps." },
] as const

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied (permissions, insecure context) — the
      // field's own text is still selectable/copyable by hand as a fallback.
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold tracking-[0.04em] uppercase text-(--sb-text-secondary)">{label}</label>
      <div className="flex items-center gap-2 rounded-(--sb-radius-md) border border-(--sb-border) bg-(--sb-content-bg) py-1 pr-1 pl-4">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-(--sb-text-primary)">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-(--sb-radius-sm) px-3.5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
          style={
            copied
              ? { background: "var(--brand-green)", color: "white" }
              : { background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }
          }
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}

function ReferEarnPage() {
  const { isAuthenticated } = useAuth()
  const { data: profile, isLoading } = useProfile()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="text-center">
        <span
          className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 16%, transparent)" }}
        >
          <Gift className="size-7" style={{ color: "var(--sb-accent-gold)" }} aria-hidden="true" strokeWidth={2} />
        </span>
        <h1 className="text-2xl font-bold text-(--sb-text-primary) sm:text-3xl">Refer &amp; Earn</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-(--sb-text-secondary)">Invite friends to exchlotus and earn rewards together once they join.</p>
      </div>

      {!isAuthenticated ? (
        <div className="flex flex-col items-center gap-3 rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-8 text-center">
          <Users className="size-8" style={{ color: "var(--sb-text-secondary)" }} aria-hidden="true" />
          <p className="font-semibold text-(--sb-text-primary)">Log in to get your referral link</p>
          <p className="max-w-sm text-sm text-(--sb-text-secondary)">Every player gets their own link and code to share once they have an account.</p>
          <Link
            to="/login"
            search={{ redirect: "/dashboard/refer-earn" }}
            className="mt-2 flex h-11 items-center rounded-(--sb-radius-md) px-6 text-sm font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            style={{ background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }}
          >
            Log In / Sign Up
          </Link>
        </div>
      ) : (
        <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-6">
          {isLoading || !profile ? (
            <div className="flex flex-col gap-3">
              <div className="h-4 w-24 animate-pulse rounded bg-(--sb-border)" />
              <div className="h-11 w-full animate-pulse rounded-(--sb-radius-md) bg-(--sb-border)" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <CopyField label="Your referral code" value={profile.username} />
              <CopyField label="Your referral link" value={`${window.location.origin}/login?view=register&promo=${encodeURIComponent(profile.username)}`} />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 16%, transparent)", color: "var(--sb-accent-gold)" }}
              >
                {i + 1}
              </span>
              <step.icon className="size-5" style={{ color: "var(--sb-text-secondary)" }} aria-hidden="true" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-(--sb-text-primary)">{step.title}</h3>
            <p className="mt-1 text-sm text-(--sb-text-secondary)">{step.description}</p>
          </div>
        ))}
      </div>

      {/* Honest, not fabricated — sharing already works (a code entered at
          sign-up is recorded on the new account today), but no reward
          engine reads it yet. Same "coming soon" convention as
          features/account/ComingSoon.tsx elsewhere in the app. */}
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-(--sb-radius-md) px-4 py-3 text-sm"
        style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 8%, transparent)", color: "var(--sb-text-secondary)" }}
      >
        <Info className="mt-0.5 size-4.5 shrink-0" style={{ color: "var(--sb-accent-gold)" }} aria-hidden="true" />
        Sharing your link works today — a friend's account is linked to your code the moment they sign up. Referral
        rewards and payouts aren't live yet, so nothing pays out automatically until that's turned on.
      </div>
    </div>
  )
}
