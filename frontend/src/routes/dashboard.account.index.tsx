import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Gift, History as HistoryIcon, Lock, RefreshCw, Wallet as WalletIcon } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { useTransactionPage } from "@/hooks/useTransactionPage"
import { TransactionTable } from "@/features/account/TransactionTable"
import { StatCard } from "@/features/account/StatCard"
import { QuickActionCard } from "@/features/account/QuickActionCard"
import { formatInr } from "@/lib/utils"

export const Route = createFileRoute("/dashboard/account/")({
  component: AccountOverviewPage,
})

const quickActions = [
  { to: "/dashboard/account/deposit", label: "Deposit", icon: ArrowDownLeft, variant: "primary" as const },
  { to: "/dashboard/account/withdraw", label: "Withdraw", icon: ArrowUpRight, variant: "primary" as const },
  { to: "/dashboard/account/history", label: "History", icon: HistoryIcon, variant: "secondary" as const },
  { to: "/dashboard/account/loyalty", label: "Loyalty", icon: Gift, variant: "secondary" as const },
]

function AccountOverviewPage() {
  const { data: wallet, isLoading, isError, refetch, isFetching } = useWallet()
  const { items, isLoading: txLoading, isError: txError, refetch: refetchTx, hasNext, hasPrev, nextPage, prevPage } = useTransactionPage(5)

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-between rounded-[var(--acc-radius-lg)] px-4 py-3.5"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full" style={{ background: "rgb(255 255 255 / 22%)" }}>
            <WalletIcon className="size-6.5" aria-hidden="true" strokeWidth={2} />
          </span>
          <div>
            <p className="text-xs opacity-90">Total Balance</p>
            {isLoading ? (
              <span className="mt-1 inline-block h-6 w-24 animate-pulse rounded bg-white/30" aria-label="Loading balance" />
            ) : isError ? (
              <span className="text-sm">Couldn't load balance.</span>
            ) : (
              <p className="text-xl leading-tight font-semibold">{formatInr(wallet?.balance ?? 0)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          aria-label="Refresh balance"
          className="rounded-full p-2 outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
        >
          <RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" strokeWidth={2.1} />
        </button>
      </div>

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--acc-radius-md)] px-4 py-2.5 text-sm" style={{ background: "var(--acc-danger-bg)", color: "var(--acc-danger)" }}>
          <span className="flex items-center gap-2">
            <AlertCircle className="size-5.5 shrink-0" aria-hidden="true" />
            Couldn't load wallet.
          </span>
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={WalletIcon} label="Total Balance" value={wallet?.balance ?? 0} description="Deposit + withdrawable + bonus" loading={isLoading} />
        <StatCard icon={ArrowDownLeft} label="Deposit Cash" value={(wallet?.balance ?? 0) - (wallet?.bonusBalance ?? 0)} description="Balance excluding bonus funds" loading={isLoading} />
        <StatCard icon={ArrowUpRight} label="Withdrawable Cash" value={wallet?.withdrawableCash ?? 0} description="Winnings available to withdraw" tone="success" loading={isLoading} />
        <StatCard icon={Gift} label="Earned Bonus" value={wallet?.bonusBalance ?? 0} description="Bonus funds credited to your account" tone="success" loading={isLoading} />
        <StatCard icon={Lock} label="Locked Bonus" value={wallet?.lockedBalance ?? 0} description="Pending wagering requirements" loading={isLoading} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => (
          <QuickActionCard key={action.to} {...action} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[color:var(--acc-text-primary)]">Recent Transactions</h2>
        <Link
          to="/dashboard/account/history"
          className="rounded-sm text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
          style={{ color: "var(--acc-accent)" }}
        >
          View All Transactions
        </Link>
      </div>

      <TransactionTable
        items={items}
        isLoading={txLoading}
        isError={txError}
        onRetry={refetchTx}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={nextPage}
        onPrev={prevPage}
      />
    </div>
  )
}
