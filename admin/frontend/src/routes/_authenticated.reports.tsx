import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, Dices, LayoutGrid, List, TrendingUp, Users as UsersIcon, Wallet } from "lucide-react"
import {
  getActiveUsers,
  getFinanceBreakdown,
  getFinanceTrend,
  getPopularGames,
  getRevenueSummary,
  getUserGrowth,
  type ReportRangeParams,
} from "@/api/reports.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { LineChart } from "@/components/shared/LineChart"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { ExportButton } from "@/components/shared/ExportButton"
import { ErrorState } from "@/components/shared/ErrorState"
import { EmptyState } from "@/components/shared/EmptyState"
import { MetricCard } from "@/components/shared/MetricCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { computeTrend, getPresetRange, getPreviousPeriod, type DateRange, type DateRangePreset } from "@/lib/dateRanges"

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
})

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function toParams(range: DateRange): ReportRangeParams {
  return { dateFrom: range.dateFrom.toISOString(), dateTo: range.dateTo.toISOString() }
}

/** Fetches a range, and — when `compare` is on — the same-length previous period alongside it. */
function useComparableQuery<T>(key: string, range: DateRange, compare: boolean, fetcher: (params: ReportRangeParams) => Promise<T>) {
  const current = useQuery({ queryKey: ["reports", key, range.dateFrom.toISOString(), range.dateTo.toISOString()], queryFn: () => fetcher(toParams(range)) })
  const previousRange = useMemo(() => getPreviousPeriod(range), [range])
  const previous = useQuery({
    queryKey: ["reports", key, "previous", previousRange.dateFrom.toISOString(), previousRange.dateTo.toISOString()],
    queryFn: () => fetcher(toParams(previousRange)),
    enabled: compare,
  })
  return { current, previous: compare ? previous : undefined }
}

function ViewToggle({ view, onChange }: { view: "chart" | "table"; onChange: (v: "chart" | "table") => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
      <Button variant={view === "chart" ? "default" : "ghost"} size="icon" aria-label="Chart view" onClick={() => onChange("chart")}>
        <LayoutGrid className="size-3.5" />
      </Button>
      <Button variant={view === "table" ? "default" : "ghost"} size="icon" aria-label="Table view" onClick={() => onChange("table")}>
        <List className="size-3.5" />
      </Button>
    </div>
  )
}

function ChartCard({
  title,
  description,
  icon: Icon,
  isLoading,
  isError,
  onRetry,
  view,
  onViewChange,
  chart,
  table,
}: {
  title: string
  description: string
  icon: typeof TrendingUp
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  view: "chart" | "table"
  onViewChange: (v: "chart" | "table") => void
  chart: React.ReactNode
  table: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {!isLoading && !isError && <ViewToggle view={view} onChange={onViewChange} />}
      </div>
      {isLoading && <Skeleton className="h-56 w-full" />}
      {isError && <ErrorState title={`Unable to load ${title.toLowerCase()}`} onRetry={onRetry} />}
      {!isLoading && !isError && (view === "chart" ? chart : table)}
    </div>
  )
}

function DayTable({ rows, valueLabel, formatValue = (v: number) => v.toLocaleString() }: {
  rows: { day: string; value: number }[]
  valueLabel: string
  formatValue?: (v: number) => string
}) {
  if (rows.length === 0) return <EmptyState title="No data in this range" description="Try a wider date range." />
  return (
    <div className="max-h-72 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>{valueLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.day}>
              <TableCell className="text-muted-foreground">{formatShortDate(r.day)}</TableCell>
              <TableCell className="tabular-nums">{formatValue(r.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function KpiCard({ icon, label, value, current, previous, compare, formatValue = (v: number) => v.toLocaleString() }: {
  icon: typeof TrendingUp
  label: string
  value: number
  current?: number
  previous?: number
  compare: boolean
  formatValue?: (v: number) => string
}) {
  const trend = compare && current !== undefined && previous !== undefined ? computeTrend(current, previous) : null
  return (
    <MetricCard
      icon={icon}
      label={label}
      value={formatValue(value)}
      trend={trend ? { changePct: trend.changePct, tone: trend.changePct >= 0 ? "positive" : "negative", label: "vs previous period" } : undefined}
    />
  )
}

function PopularGamesList({ range }: { range: DateRange }) {
  const popularGames = useQuery({
    queryKey: ["reports", "popular-games", range.dateFrom.toISOString(), range.dateTo.toISOString()],
    queryFn: () => getPopularGames({ ...toParams(range), limit: 10 }),
  })
  const maxBetCount = Math.max(1, ...(popularGames.data?.map((g) => g.betCount) ?? [1]))

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Dices className="size-4 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">Popular games</p>
          <p className="text-xs text-muted-foreground">Ranked by bet count in this range</p>
        </div>
      </div>
      {popularGames.isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}
      {popularGames.isError && <ErrorState title="Unable to load popular games" onRetry={() => popularGames.refetch()} />}
      {!popularGames.isLoading && !popularGames.isError && popularGames.data?.length === 0 && (
        <EmptyState icon={Dices} title="No bets in this range" description="Try a wider date range." />
      )}
      {!popularGames.isLoading && !popularGames.isError && popularGames.data && popularGames.data.length > 0 && (
        <ol className="flex flex-col gap-2.5">
          {popularGames.data.map((game) => (
            <li key={game.gameId} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm text-foreground" title={game.gameName ?? game.gameId}>
                {game.gameName ?? game.gameId}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(game.betCount / maxBetCount) * 100}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{game.betCount.toLocaleString()} bets</span>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{formatCurrency(game.betVolume)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function OverviewTab({ range, compare }: { range: DateRange; compare: boolean }) {
  const [userGrowthView, setUserGrowthView] = useState<"chart" | "table">("chart")
  const [financeView, setFinanceView] = useState<"chart" | "table">("chart")
  const userGrowth = useComparableQuery("user-growth", range, compare, getUserGrowth)
  const financeTrend = useComparableQuery("finance-trend", range, compare, getFinanceTrend)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="User growth"
          description="New player registrations per day"
          icon={UsersIcon}
          isLoading={userGrowth.current.isLoading}
          isError={userGrowth.current.isError}
          onRetry={() => userGrowth.current.refetch()}
          view={userGrowthView}
          onViewChange={setUserGrowthView}
          chart={
            <LineChart
              series={[{ name: "New users", colorVar: "var(--primary)", points: (userGrowth.current.data ?? []).map((p) => ({ x: p.day, y: p.newUsers })) }]}
              formatX={formatShortDate}
            />
          }
          table={<DayTable rows={(userGrowth.current.data ?? []).map((p) => ({ day: p.day, value: p.newUsers }))} valueLabel="New users" />}
        />

        <ChartCard
          title="Deposits vs withdrawals"
          description="Daily wallet flow, same figures as the Finance ledger"
          icon={TrendingUp}
          isLoading={financeTrend.current.isLoading}
          isError={financeTrend.current.isError}
          onRetry={() => financeTrend.current.refetch()}
          view={financeView}
          onViewChange={setFinanceView}
          chart={
            <LineChart
              series={[
                { name: "Deposits", colorVar: "var(--success)", points: (financeTrend.current.data ?? []).map((p) => ({ x: p.day, y: p.deposits })) },
                { name: "Withdrawals", colorVar: "var(--warning)", points: (financeTrend.current.data ?? []).map((p) => ({ x: p.day, y: p.withdrawals })) },
              ]}
              formatValue={(v) => formatCurrency(v)}
              formatX={formatShortDate}
            />
          }
          table={
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Deposits</TableHead>
                    <TableHead>Withdrawals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(financeTrend.current.data ?? []).map((p) => (
                    <TableRow key={p.day}>
                      <TableCell className="text-muted-foreground">{formatShortDate(p.day)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(p.deposits)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(p.withdrawals)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        />
      </div>

      <PopularGamesList range={range} />
    </div>
  )
}

function FinancialTab({ range, compare }: { range: DateRange; compare: boolean }) {
  const revenue = useComparableQuery("revenue-summary", range, compare, getRevenueSummary)
  const breakdown = useQuery({
    queryKey: ["reports", "finance-breakdown", range.dateFrom.toISOString(), range.dateTo.toISOString()],
    queryFn: () => getFinanceBreakdown(toParams(range)),
  })

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          icon={Wallet}
          label="Deposits"
          value={revenue.current.data?.depositsAmount ?? 0}
          current={revenue.current.data?.depositsAmount}
          previous={revenue.previous?.data?.depositsAmount}
          compare={compare}
          formatValue={formatCurrency}
        />
        <KpiCard
          icon={Wallet}
          label="Withdrawals"
          value={revenue.current.data?.withdrawalsAmount ?? 0}
          current={revenue.current.data?.withdrawalsAmount}
          previous={revenue.previous?.data?.withdrawalsAmount}
          compare={compare}
          formatValue={formatCurrency}
        />
        <KpiCard
          icon={TrendingUp}
          label="Net cash flow"
          value={revenue.current.data?.netCashFlow ?? 0}
          current={revenue.current.data?.netCashFlow}
          previous={revenue.previous?.data?.netCashFlow}
          compare={compare}
          formatValue={formatCurrency}
        />
      </section>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">Ledger breakdown by type</p>
            <p className="text-xs text-muted-foreground">Every transaction type, day by day — the raw numbers behind every other chart on this page</p>
          </div>
        </div>
        {breakdown.isLoading && <Skeleton className="h-40 w-full" />}
        {breakdown.isError && <ErrorState title="Unable to load the breakdown" onRetry={() => breakdown.refetch()} />}
        {!breakdown.isLoading && !breakdown.isError && breakdown.data?.length === 0 && (
          <EmptyState title="No ledger activity in this range" description="Try a wider date range." />
        )}
        {!breakdown.isLoading && !breakdown.isError && breakdown.data && breakdown.data.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.data.map((row) => (
                  <TableRow key={`${row.day}-${row.type}`}>
                    <TableCell className="text-muted-foreground">{formatShortDate(row.day)}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell className="tabular-nums">{row.count.toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function UsersTab({ range, compare }: { range: DateRange; compare: boolean }) {
  const [growthView, setGrowthView] = useState<"chart" | "table">("chart")
  const [activeView, setActiveView] = useState<"chart" | "table">("chart")
  const userGrowth = useComparableQuery("user-growth", range, compare, getUserGrowth)
  const activeUsers = useComparableQuery("active-users", range, compare, getActiveUsers)

  const totalNewUsers = (userGrowth.current.data ?? []).reduce((sum, p) => sum + p.newUsers, 0)
  const totalNewUsersPrevious = (userGrowth.previous?.data ?? []).reduce((sum, p) => sum + p.newUsers, 0)
  const avgActive = (activeUsers.current.data ?? []).length
    ? Math.round((activeUsers.current.data ?? []).reduce((sum, p) => sum + p.activeUsers, 0) / (activeUsers.current.data ?? []).length)
    : 0
  const avgActivePrevious = (activeUsers.previous?.data ?? []).length
    ? Math.round((activeUsers.previous?.data ?? []).reduce((sum, p) => sum + p.activeUsers, 0) / (activeUsers.previous?.data ?? []).length)
    : 0

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard icon={UsersIcon} label="New registrations" value={totalNewUsers} current={totalNewUsers} previous={totalNewUsersPrevious} compare={compare} />
        <KpiCard icon={UsersIcon} label="Avg. daily active users" value={avgActive} current={avgActive} previous={avgActivePrevious} compare={compare} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="User growth"
          description="New player registrations per day"
          icon={UsersIcon}
          isLoading={userGrowth.current.isLoading}
          isError={userGrowth.current.isError}
          onRetry={() => userGrowth.current.refetch()}
          view={growthView}
          onViewChange={setGrowthView}
          chart={
            <LineChart
              series={[{ name: "New users", colorVar: "var(--primary)", points: (userGrowth.current.data ?? []).map((p) => ({ x: p.day, y: p.newUsers })) }]}
              formatX={formatShortDate}
            />
          }
          table={<DayTable rows={(userGrowth.current.data ?? []).map((p) => ({ day: p.day, value: p.newUsers }))} valueLabel="New users" />}
        />
        <ChartCard
          title="Active users"
          description="Distinct players who placed a bet each day — the platform has no login/session log, so this is the honest definition of 'active' the data supports"
          icon={UsersIcon}
          isLoading={activeUsers.current.isLoading}
          isError={activeUsers.current.isError}
          onRetry={() => activeUsers.current.refetch()}
          view={activeView}
          onViewChange={setActiveView}
          chart={
            <LineChart
              series={[{ name: "Active users", colorVar: "var(--info)", points: (activeUsers.current.data ?? []).map((p) => ({ x: p.day, y: p.activeUsers })) }]}
              formatX={formatShortDate}
            />
          }
          table={<DayTable rows={(activeUsers.current.data ?? []).map((p) => ({ day: p.day, value: p.activeUsers }))} valueLabel="Active users" />}
        />
      </div>
    </div>
  )
}

function GamingTab({ range, compare }: { range: DateRange; compare: boolean }) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const breakdown = useComparableQuery("finance-breakdown", range, compare, getFinanceBreakdown)

  const byDay = useMemo(() => {
    const map = new Map<string, { day: string; betVolume: number; winVolume: number }>()
    for (const row of breakdown.current.data ?? []) {
      if (row.type !== "BET" && row.type !== "WIN") continue
      const entry = map.get(row.day) ?? { day: row.day, betVolume: 0, winVolume: 0 }
      if (row.type === "BET") entry.betVolume = row.total
      else entry.winVolume = row.total
      map.set(row.day, entry)
    }
    return [...map.values()].sort((a, b) => a.day.localeCompare(b.day))
  }, [breakdown.current.data])

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        title="Betting volume vs wins paid"
        description="Total wagered and total paid out, per day"
        icon={Dices}
        isLoading={breakdown.current.isLoading}
        isError={breakdown.current.isError}
        onRetry={() => breakdown.current.refetch()}
        view={view}
        onViewChange={setView}
        chart={
          <LineChart
            series={[
              { name: "Wagered", colorVar: "var(--primary)", points: byDay.map((p) => ({ x: p.day, y: p.betVolume })) },
              { name: "Paid out", colorVar: "var(--success)", points: byDay.map((p) => ({ x: p.day, y: p.winVolume })) },
            ]}
            formatValue={(v) => formatCurrency(v)}
            formatX={formatShortDate}
          />
        }
        table={
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Wagered</TableHead>
                  <TableHead>Paid out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDay.map((p) => (
                  <TableRow key={p.day}>
                    <TableCell className="text-muted-foreground">{formatShortDate(p.day)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(p.betVolume)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(p.winVolume)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />

      <PopularGamesList range={range} />
    </div>
  )
}

function RevenueTab({ range, compare }: { range: DateRange; compare: boolean }) {
  const revenue = useComparableQuery("revenue-summary", range, compare, getRevenueSummary)
  const c = revenue.current.data
  const p = revenue.previous?.data

  if (revenue.current.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }
  if (revenue.current.isError || !c) return <ErrorState title="Unable to load revenue summary" onRetry={() => revenue.current.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={Wallet} label="Deposits" value={c.depositsAmount} current={c.depositsAmount} previous={p?.depositsAmount} compare={compare} formatValue={formatCurrency} />
        <KpiCard icon={Wallet} label="Withdrawals" value={c.withdrawalsAmount} current={c.withdrawalsAmount} previous={p?.withdrawalsAmount} compare={compare} formatValue={formatCurrency} />
        <KpiCard icon={TrendingUp} label="Net cash flow" value={c.netCashFlow} current={c.netCashFlow} previous={p?.netCashFlow} compare={compare} formatValue={formatCurrency} />
        <KpiCard icon={Wallet} label="Total wallet balance" value={c.totalWalletBalance} compare={false} formatValue={formatCurrency} />
        <KpiCard icon={Dices} label="Wagered" value={c.betVolume} current={c.betVolume} previous={p?.betVolume} compare={compare} formatValue={formatCurrency} />
        <KpiCard icon={Dices} label="Paid out" value={c.winVolume} current={c.winVolume} previous={p?.winVolume} compare={compare} formatValue={formatCurrency} />
        <KpiCard
          icon={TrendingUp}
          label="Wagered − paid out"
          value={c.wageredMinusPaidOut}
          current={c.wageredMinusPaidOut}
          previous={p?.wageredMinusPaidOut}
          compare={compare}
          formatValue={formatCurrency}
        />
      </section>
      <p className="text-xs text-muted-foreground">
        "Wagered − paid out" is a raw ledger delta, not a profit/loss figure — the platform has no bonus or promotion engine, so it excludes costs a real revenue
        calculation would need to account for.
      </p>
    </div>
  )
}

function ReportsPage() {
  const [preset, setPreset] = useState<DateRangePreset>("last30")
  const [range, setRange] = useState<DateRange>(() => getPresetRange("last30"))
  const [compare, setCompare] = useState(false)
  const [tab, setTab] = useState("overview")

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Computed live from the ledger, no cached summaries."
        actions={
          <ExportButton
            module="reports"
            formats={["csv", "pdf"]}
            filters={{ dateFrom: range.dateFrom.toISOString(), dateTo: range.dateTo.toISOString() }}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker
          preset={preset}
          value={range}
          onChange={(nextRange, nextPreset) => {
            setRange(nextRange)
            setPreset(nextPreset)
          }}
        />
        <Button variant={compare ? "default" : "outline"} size="sm" onClick={() => setCompare((v) => !v)}>
          Compare to previous period
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="gaming">Gaming</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab range={range} compare={compare} />
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <FinancialTab range={range} compare={compare} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab range={range} compare={compare} />
        </TabsContent>
        <TabsContent value="gaming" className="mt-4">
          <GamingTab range={range} compare={compare} />
        </TabsContent>
        <TabsContent value="revenue" className="mt-4">
          <RevenueTab range={range} compare={compare} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
