import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ChevronRight, ScrollText, ShieldAlert, UserPlus, Users, Wallet } from "lucide-react"
import { getDashboardSummary } from "@/api/dashboard.api"
import { listAuditLogs } from "@/api/audit.api"
import { listUsers } from "@/api/users.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { ErrorState } from "@/components/shared/ErrorState"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
})

interface ActivityRow {
  id: string
  at: string
  icon: typeof UserPlus
  text: string
  meta?: string
}

function useActivityFeed() {
  const audit = useQuery({ queryKey: ["audit", "recent"], queryFn: () => listAuditLogs({ limit: 8 }) })
  const users = useQuery({ queryKey: ["users", "recent"], queryFn: () => listUsers({ limit: 8 }) })

  const rows: ActivityRow[] = [
    ...(audit.data?.items.map((log) => ({
      id: `audit-${log.id}`,
      at: log.createdAt,
      icon: log.action.startsWith("wallet") ? Wallet : log.action.startsWith("user") ? Users : ShieldAlert,
      text: `${log.adminName} — ${log.action.replaceAll(".", " ").replaceAll("_", " ")}`,
      meta: log.reason ?? `${log.entityType} ${log.entityId.slice(0, 8)}`,
    })) ?? []),
    ...(users.data?.items.map((u) => ({
      id: `user-${u.id}`,
      at: u.createdAt,
      icon: UserPlus,
      text: `New player registered — ${u.username}`,
      meta: u.phone ?? u.email ?? undefined,
    })) ?? []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return { rows: rows.slice(0, 10), isLoading: audit.isLoading || users.isLoading, isError: audit.isError || users.isError }
}

function ActionRequired({ withoutMfaCount }: { withoutMfaCount: number }) {
  if (withoutMfaCount === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Action required</p>
        <p className="mt-3 text-sm text-muted-foreground">Nothing needs your attention right now.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-warning/30 bg-card p-4">
      <p className="text-sm font-medium text-foreground">Action required</p>
      <Link
        to="/admins"
        className="mt-3 flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-hover-tint focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          <span>
            <strong className="tabular-nums">{withoutMfaCount}</strong> admin{withoutMfaCount === 1 ? "" : "s"} without MFA enabled
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </Link>
    </div>
  )
}

function ActivityFeed() {
  const { rows, isLoading, isError } = useActivityFeed()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }
  if (isError) return <ErrorState title="Unable to load recent activity" />
  if (rows.length === 0) return <EmptyState icon={ScrollText} title="No recent activity" description="Admin actions and new registrations will show up here." />

  return (
    <ol className="flex flex-col">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <row.icon className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{row.text}</p>
            {row.meta && <p className="truncate text-xs text-muted-foreground">{row.meta}</p>}
          </div>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.at)}</span>
        </li>
      ))}
    </ol>
  )
}

function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={data ? `Updated ${formatDateTime(data.generatedAt)}` : undefined} />

      {isLoading && <CardSkeletonGrid count={4} />}
      {isError && <ErrorState title="Unable to load dashboard data" onRetry={() => refetch()} />}

      {data && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Users} label="Total users" value={data.users.total.toLocaleString()} hint={`${data.users.newToday} new today`} />
            <MetricCard icon={Users} label="Active users" value={data.users.active.toLocaleString()} hint={`${data.users.suspended} suspended`} />
            <MetricCard
              icon={ArrowDownToLine}
              label="Deposits today"
              value={formatCurrency(data.finance.depositsTodayAmount)}
              trend={{ changePct: data.finance.depositsChangePct, tone: data.finance.depositsChangePct >= 0 ? "positive" : "negative", label: "vs yesterday" }}
            />
            <MetricCard
              icon={ArrowUpFromLine}
              label="Withdrawals today"
              value={formatCurrency(data.finance.withdrawalsTodayAmount)}
              trend={{ changePct: data.finance.withdrawalsChangePct, tone: "neutral", label: "vs yesterday" }}
            />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Wallet} label="Total wallet balance" value={formatCurrency(data.finance.totalWalletBalance)} />
            <MetricCard icon={ScrollText} label="Ledger entries today" value={data.activity.ledgerEntriesToday.toLocaleString()} />
            <MetricCard icon={ShieldAlert} label="Active admins" value={data.admins.activeCount.toLocaleString()} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <ActionRequired withoutMfaCount={data.admins.withoutMfaCount} />
            </div>
            <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
              <p className="mb-1 text-sm font-medium text-foreground">Platform activity</p>
              <ActivityFeed />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
