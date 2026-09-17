import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Coins, Gift, Sparkles, Users } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBonusRules, useBonusTransactions, useBonusWallet, useConvertBonusCoins } from "@/hooks/useBonus"
import { friendlyErrorMessage } from "@/api/api-error"
import type { BonusTransactionEntry } from "@/api/bonus.api"
import { formatInr } from "@/lib/utils"

export const Route = createFileRoute("/dashboard/bonus")({
  component: BonusPage,
})

function ConversionCard() {
  const { data: wallet, isLoading: walletLoading } = useBonusWallet()
  const { data: rules } = useBonusRules()
  const convert = useConvertBonusCoins()
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

  if (walletLoading || !wallet || !rules) {
    return <div className="h-40 animate-pulse rounded-(--sb-radius-lg) bg-(--sb-border)" />
  }

  const progressPct = Math.min(100, (wallet.coinBalance / rules.conversionCoinThreshold) * 100)

  function handleConvert() {
    // Minted once per submit intent and reused across a retry (see
    // useConvertBonusCoins) — a re-click after a failed attempt is a safe
    // replay server-side, not a second conversion.
    const key = idempotencyKey ?? crypto.randomUUID()
    setIdempotencyKey(key)
    convert.mutate(key, { onSuccess: () => setIdempotencyKey(null) })
  }

  return (
    <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.04em] text-(--sb-text-secondary) uppercase">Bonus Coins</p>
            <p className="text-3xl font-bold text-(--sb-text-primary)">{wallet.coinBalance.toLocaleString("en-IN")}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-[0.04em] text-(--sb-text-secondary) uppercase">Equivalent Value</p>
            <p className="text-lg font-bold text-(--sb-text-primary)">{formatInr(wallet.convertibleRupeeValue)}</p>
          </div>
        </div>

        <div className="rounded-(--sb-radius-md) border border-(--sb-border) p-3">
          <p className="text-xs font-bold tracking-[0.04em] text-(--sb-text-secondary) uppercase">Playable Bonus Balance</p>
          <p className="text-lg font-bold text-(--sb-text-primary)">{formatInr(wallet.playableBonusBalance)}</p>
          <p className="mt-0.5 text-xs text-(--sb-text-secondary)">
            Converted bonus principal — usable for gameplay, not directly withdrawable. Winnings from playing it follow normal withdrawal rules.
          </p>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-(--sb-border)">
            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "var(--sb-accent-gold)" }} />
          </div>
          <p className="mt-1.5 text-xs text-(--sb-text-secondary)">
            {wallet.eligibleForConversion
              ? `${rules.conversionCoinThreshold.toLocaleString("en-IN")} coins reached — ready to convert`
              : `${wallet.coinsUntilEligible.toLocaleString("en-IN")} more coins to unlock conversion`}
          </p>
        </div>

        {wallet.eligibleForConversion && (
          <div className="rounded-(--sb-radius-md) p-4 text-sm" style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 8%, transparent)" }}>
            <p className="font-semibold text-(--sb-text-primary)">
              {rules.conversionCoinThreshold.toLocaleString("en-IN")} Coins → {formatInr(rules.conversionRupeeValue)} Bonus Value
            </p>
            <p className="text-(--sb-text-secondary)">
              {rules.conversionPayoutPercent}% Convertible → {formatInr(rules.conversionPayoutRupees)} Playable Bonus
            </p>
          </div>
        )}

        {convert.isError && <p className="text-sm" style={{ color: "#f87171" }}>{friendlyErrorMessage(convert.error)}</p>}
        {convert.isSuccess && (
          <p className="text-sm font-semibold" style={{ color: "var(--brand-green)" }}>
            Converted! {formatInr(convert.data.rupeesCredited)} added to your playable balance.
          </p>
        )}

        <button
          type="button"
          onClick={handleConvert}
          disabled={!wallet.eligibleForConversion || convert.isPending}
          className="flex h-11 items-center justify-center gap-2 rounded-(--sb-radius-md) text-sm font-bold outline-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
          style={{ background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {convert.isPending ? "Converting…" : "Convert to Play Balance"}
        </button>
        {!wallet.eligibleForConversion && (
          <p className="text-center text-xs text-(--sb-text-secondary)">
            Reach {rules.conversionCoinThreshold.toLocaleString("en-IN")} bonus coins to unlock conversion.
          </p>
        )}
      </div>
    </div>
  )
}

function BonusRulesPanel() {
  const { data: rules, isLoading } = useBonusRules()
  if (isLoading || !rules) {
    return <div className="h-32 animate-pulse rounded-(--sb-radius-lg) bg-(--sb-border)" />
  }

  const rows = [
    { label: "Welcome Bonus", value: `${rules.welcomeBonusCoins.toLocaleString("en-IN")} Coins = ${formatInr(rules.welcomeBonusCoins / rules.coinsPerRupee)}` },
    { label: "Referral Join", value: `${rules.referralJoinBonusCoins.toLocaleString("en-IN")} Coins = ${formatInr(rules.referralJoinBonusCoins / rules.coinsPerRupee)}` },
    {
      label: "Referral First Deposit",
      value: `${rules.referralFirstDepositBonusCoins.toLocaleString("en-IN")} Coins = ${formatInr(rules.referralFirstDepositBonusCoins / rules.coinsPerRupee)}`,
    },
    { label: "Coin Conversion", value: `${rules.conversionCoinThreshold.toLocaleString("en-IN")} Coins = ${formatInr(rules.conversionRupeeValue)} Value` },
    { label: "Convertible", value: `${rules.conversionPayoutPercent}% = ${formatInr(rules.conversionPayoutRupees)} Playable Balance` },
  ]

  return (
    <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-6">
      <h2 className="mb-4 text-lg font-bold text-(--sb-text-primary)">Bonus Rules</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-(--sb-text-secondary)">{row.label}</dt>
            <dd className="text-sm font-semibold text-(--sb-text-primary)">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-(--sb-text-secondary)">
        Bonus conversion is for gameplay only. Converted bonus principal is not directly withdrawable. Winnings generated through eligible
        gameplay may be withdrawable according to platform rules.
      </p>
    </div>
  )
}

const TYPE_LABEL: Record<BonusTransactionEntry["type"], string> = {
  WELCOME_BONUS: "Welcome Bonus",
  REFERRAL_JOIN_BONUS: "Referral Join Bonus",
  REFERRAL_FIRST_DEPOSIT_BONUS: "Referral First-Deposit Bonus",
  BONUS_CONVERSION: "Coin Conversion",
  BONUS_ADJUSTMENT: "Admin Adjustment",
  BONUS_REVERSAL: "Reversal",
  REFERRAL_CASH_REWARD: "Referral Cash Reward",
  REFERRAL_COIN_REWARD: "Referral Coin Reward",
  REFERRAL_REVERSAL: "Referral Reversal",
  REFERRAL_EXPIRY: "Referral Expiry",
  ADMIN_ADJUSTMENT: "Admin Adjustment",
}

function BonusTransactionsTable() {
  const { data, isLoading } = useBonusTransactions()

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-(--sb-radius-lg) bg-(--sb-border)" />
  }
  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-8 text-center">
        <Coins className="size-7" style={{ color: "var(--sb-text-secondary)" }} aria-hidden="true" />
        <p className="text-sm text-(--sb-text-secondary)">No bonus transactions yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-(--sb-radius-lg) border border-(--sb-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--sb-border) text-xs text-(--sb-text-secondary)">
            <th className="px-4 py-2.5 font-semibold">Date</th>
            <th className="px-4 py-2.5 font-semibold">Type</th>
            <th className="px-4 py-2.5 font-semibold">Amount</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id} className="border-b border-(--sb-border) last:border-0">
              <td className="px-4 py-2.5 text-(--sb-text-secondary)">{new Date(item.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2.5 font-medium text-(--sb-text-primary)">{TYPE_LABEL[item.type]}</td>
              <td className="px-4 py-2.5 tabular-nums text-(--sb-text-secondary)">
                {item.currency === "COIN" ? `${item.amount > 0 ? "+" : ""}${item.amount.toLocaleString("en-IN")} coins` : formatInr(item.amount)}
              </td>
              <td className="px-4 py-2.5 text-(--sb-text-secondary)">{item.status}</td>
              <td className="px-4 py-2.5 text-(--sb-text-secondary)">{item.description ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BonusPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="text-center">
        <span
          className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 16%, transparent)" }}
        >
          <Coins className="size-7" style={{ color: "var(--sb-accent-gold)" }} aria-hidden="true" strokeWidth={2} />
        </span>
        <h1 className="text-2xl font-bold text-(--sb-text-primary) sm:text-3xl">Bonus Wallet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-(--sb-text-secondary)">
          Earn bonus coins from the welcome bonus and referrals, then convert them into playable balance.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="flex flex-col items-center gap-3 rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-8 text-center">
          <Gift className="size-8" style={{ color: "var(--sb-text-secondary)" }} aria-hidden="true" />
          <p className="font-semibold text-(--sb-text-primary)">Log in to see your bonus wallet</p>
          <p className="max-w-sm text-sm text-(--sb-text-secondary)">Every player earns a welcome bonus and can convert coins once they reach 50,000.</p>
          <Link
            to="/login"
            search={{ redirect: "/dashboard/bonus" }}
            className="mt-2 flex h-11 items-center rounded-(--sb-radius-md) px-6 text-sm font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            style={{ background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }}
          >
            Log In / Sign Up
          </Link>
        </div>
      ) : (
        <>
          <ConversionCard />
          <BonusRulesPanel />
          <div>
            <h2 className="mb-3 text-lg font-bold text-(--sb-text-primary)">Bonus Transactions</h2>
            <BonusTransactionsTable />
          </div>
        </>
      )}

      <div className="rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-alt) p-5 text-sm text-(--sb-text-secondary)">
        <div className="mb-2 flex items-center gap-2">
          <Users className="size-4" aria-hidden="true" />
          <span className="font-semibold text-(--sb-text-primary)">Want more coins?</span>
        </div>
        Invite friends from the{" "}
        <Link to="/dashboard/refer-earn" className="font-semibold underline">
          Refer &amp; Earn
        </Link>{" "}
        page — you earn coins when they join and again on their first deposit.
      </div>
    </div>
  )
}
