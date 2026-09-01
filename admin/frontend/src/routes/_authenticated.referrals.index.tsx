import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, Coins, Gift, Percent, Settings, Users as UsersIcon, Wallet as WalletIcon } from "lucide-react"
import { getReferralDashboard, listReferrals, type ReferralRiskStatus, type ReferralStatus } from "@/api/referrals.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { ExportButton } from "@/components/shared/ExportButton"
import { MetricCard } from "@/components/shared/MetricCard"
import { StatusBadge, REFERRAL_RISK_STATUS_CONFIG, REFERRAL_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/referrals/")({
  component: ReferralsPage,
})

type StatusFilter = ReferralStatus | "ALL"
type RiskFilter = ReferralRiskStatus | "ALL"

function ReferralDashboardCards() {
  const { data } = useQuery({ queryKey: ["referrals", "dashboard"], queryFn: getReferralDashboard })
  if (!data) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard icon={UsersIcon} label="Total referrals" value={String(data.totalReferrals)} />
      <MetricCard icon={Gift} label="Qualified" value={String(data.qualified)} />
      <MetricCard icon={CheckCircle2} label="Rewarded" value={String(data.rewarded)} />
      <MetricCard icon={Percent} label="Conversion" value={`${data.conversionRatePct.toFixed(1)}%`} />
      <MetricCard icon={WalletIcon} label="Cash rewarded" value={formatCurrency(data.totalCashRewarded, "INR")} />
      <MetricCard icon={Coins} label="Coins issued" value={data.totalCoinsIssued.toLocaleString()} />
    </div>
  )
}

function ReferralsPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [riskStatus, setRiskStatus] = useState<RiskFilter>("ALL")
  const debouncedSearch = useDebouncedValue(search, 300)

  const filters = {
    search: debouncedSearch || undefined,
    status: status === "ALL" ? undefined : status,
    riskStatus: riskStatus === "ALL" ? undefined : riskStatus,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["referrals", filters],
    queryFn: () => listReferrals({ ...filters, limit: 50 }),
  })

  const activeFilters: ActiveFilter[] = []
  if (status !== "ALL") activeFilters.push({ key: "status", label: `Status: ${status}`, onClear: () => setStatus("ALL") })
  if (riskStatus !== "ALL") activeFilters.push({ key: "risk", label: `Risk: ${riskStatus}`, onClear: () => setRiskStatus("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Refer & Earn"
        description="Referral attribution, qualification, and reward history across the platform."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/referral-campaigns">
                <Gift className="size-3.5" />
                Campaigns
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/referral-settings">
                <Settings className="size-3.5" />
                Settings
              </Link>
            </Button>
            <ExportButton module="referrals" filters={filters} />
          </div>
        }
      />

      <ReferralDashboardCards />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setStatus("ALL")
          setRiskStatus("ALL")
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, referrer, referred user…" className="w-72" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="REGISTERED">Registered</SelectItem>
            <SelectItem value="QUALIFIED">Qualified</SelectItem>
            <SelectItem value="REWARDED">Rewarded</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskStatus} onValueChange={(v) => setRiskStatus(v as RiskFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All risk levels</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="REVIEW">Needs review</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load referrals" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referrer</TableHead>
              <TableHead>Referred user</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={7} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState icon={Gift} title="No referrals match these filters" description="Try clearing the search or status filters." />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link to="/referrals/$id" params={{ id: item.id }} className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                    {item.referrer.username}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.referred.username}</TableCell>
                <TableCell className="text-muted-foreground">{item.campaign?.name ?? "—"}</TableCell>
                <TableCell className="tabular-nums">
                  {item.cashReward > 0 || item.coinReward > 0 ? (
                    <span>
                      {item.cashReward > 0 ? formatCurrency(item.cashReward, "INR") : null}
                      {item.cashReward > 0 && item.coinReward > 0 ? " + " : null}
                      {item.coinReward > 0 ? `${item.coinReward} coins` : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge config={REFERRAL_STATUS_CONFIG} status={item.status} />
                </TableCell>
                <TableCell>
                  <StatusBadge config={REFERRAL_RISK_STATUS_CONFIG} status={item.riskStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(item.registeredAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
