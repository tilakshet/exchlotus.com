import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Check, Copy, Gift, Info, Share2, UserPlus, Users, Wallet as WalletIcon } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useMyReferral, useMyReferralHistory, useMyReferralStats } from "@/hooks/useReferral"
import type { ReferralHistoryItem } from "@/api/referral.api"

export const Route = createFileRoute("/dashboard/refer-earn")({
  component: ReferEarnPage,
})

const steps = [
  { icon: Share2, title: "Share your link", description: "Send your referral link or code to friends however you like — chat, social, anywhere." },
  { icon: UserPlus, title: "They sign up", description: "A friend creates an account using your link or code. It's recorded on their account right away." },
  { icon: WalletIcon, title: "You both earn", description: "Once they qualify, the reward lands in your wallet automatically — no extra steps." },
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-4">
      <span className="text-xs text-(--sb-text-secondary)">{label}</span>
      <span className="text-xl font-bold text-(--sb-text-primary)">{value}</span>
    </div>
  )
}

const HISTORY_STATUS_LABEL: Record<ReferralHistoryItem["status"], string> = {
  PENDING: "Pending",
  REGISTERED: "Registered",
  QUALIFIED: "Qualifying",
  REWARDED: "Rewarded",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

function statusColor(status: ReferralHistoryItem["status"]): string {
  if (status === "REWARDED") return "var(--brand-green)"
  if (status === "REJECTED" || status === "CANCELLED") return "#f87171"
  return "var(--sb-accent-gold)"
}

function ReferralHistoryTable() {
  const { data, isLoading } = useMyReferralHistory()

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-(--sb-radius-lg) bg-(--sb-border)" />
  }
  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-8 text-center">
        <Users className="size-7" style={{ color: "var(--sb-text-secondary)" }} aria-hidden="true" />
        <p className="text-sm text-(--sb-text-secondary)">No referrals yet — share your link to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-(--sb-radius-lg) border border-(--sb-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--sb-border) text-xs text-(--sb-text-secondary)">
            <th className="px-4 py-2.5 font-semibold">Friend</th>
            <th className="px-4 py-2.5 font-semibold">Joined</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold">Reward</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id} className="border-b border-(--sb-border) last:border-0">
              <td className="px-4 py-2.5 font-medium text-(--sb-text-primary)">{item.friend}</td>
              <td className="px-4 py-2.5 text-(--sb-text-secondary)">{new Date(item.registeredAt).toLocaleDateString()}</td>
              <td className="px-4 py-2.5">
                <span className="font-semibold" style={{ color: statusColor(item.status) }}>
                  {HISTORY_STATUS_LABEL[item.status]}
                </span>
              </td>
              <td className="px-4 py-2.5 text-(--sb-text-secondary)">
                {item.cashReward > 0 || item.coinReward > 0
                  ? [item.cashReward > 0 ? `₹${item.cashReward}` : null, item.coinReward > 0 ? `${item.coinReward} coins` : null].filter(Boolean).join(" + ")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReferralPanel() {
  const { data: referral, isLoading: referralLoading } = useMyReferral()
  const { data: stats, isLoading: statsLoading } = useMyReferralStats()

  async function handleShare(link: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join and earn rewards", text: "Sign up with my referral link and we both earn rewards.", url: link })
        return
      } catch {
        // User cancelled the native share sheet, or it isn't actually
        // supported despite navigator.share existing — fall through to copy.
      }
    }
    navigator.clipboard.writeText(link).catch(() => {})
  }

  if (referralLoading || !referral) {
    return (
      <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-6">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-(--sb-border)" />
          <div className="h-11 w-full animate-pulse rounded-(--sb-radius-md) bg-(--sb-border)" />
        </div>
      </div>
    )
  }

  if (!referral.enabled) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-(--sb-radius-md) px-4 py-3 text-sm"
        style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 8%, transparent)", color: "var(--sb-text-secondary)" }}
      >
        <Info className="mt-0.5 size-4.5 shrink-0" style={{ color: "var(--sb-accent-gold)" }} aria-hidden="true" />
        Refer &amp; Earn isn&rsquo;t active right now — check back soon.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-6">
        <div className="flex flex-col gap-5">
          <CopyField label="Your referral code" value={referral.code} />
          <CopyField label="Your referral link" value={referral.link} />
          <button
            type="button"
            onClick={() => handleShare(referral.link)}
            className="flex h-11 items-center justify-center gap-2 rounded-(--sb-radius-md) text-sm font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            style={{ background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }}
          >
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </button>
        </div>
      </div>

      {(referral.campaign.referrerCashReward > 0 || referral.campaign.referrerCoinReward > 0) && (
        <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-5 text-sm text-(--sb-text-secondary)">
          {referral.campaign.name && <p className="mb-1 font-bold text-(--sb-text-primary)">{referral.campaign.name}</p>}
          You earn ₹{referral.campaign.referrerCashReward}
          {referral.campaign.referrerCoinReward > 0 ? ` + ${referral.campaign.referrerCoinReward} coins` : ""} per friend. They get ₹
          {referral.campaign.referredCashReward}
          {referral.campaign.referredCoinReward > 0 ? ` + ${referral.campaign.referredCoinReward} coins` : ""} too.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total referrals" value={statsLoading || !stats ? "—" : String(stats.totalReferrals)} />
        <StatTile label="Pending" value={statsLoading || !stats ? "—" : String(stats.pending)} />
        <StatTile label="Rewarded" value={statsLoading || !stats ? "—" : String(stats.rewarded)} />
        <StatTile label="Cash earned" value={statsLoading || !stats ? "—" : `₹${stats.totalCashEarned}`} />
        <StatTile label="Coins earned" value={statsLoading || !stats ? "—" : String(stats.totalCoinsEarned)} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-(--sb-text-primary)">Referral history</h2>
        <ReferralHistoryTable />
      </div>

      {referral.terms && (
        <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-5 text-xs whitespace-pre-line text-(--sb-text-secondary)">
          <p className="mb-1.5 font-bold text-(--sb-text-primary)">Terms</p>
          {referral.terms}
        </div>
      )}
    </>
  )
}

function ReferEarnPage() {
  const { isAuthenticated } = useAuth()

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
        <ReferralPanel />
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
    </div>
  )
}
