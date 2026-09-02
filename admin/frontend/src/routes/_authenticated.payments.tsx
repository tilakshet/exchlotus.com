import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { CreditCard, X } from "lucide-react"
import { listPaymentOrders, type PaymentOrderStatus } from "@/api/payments.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, PAYMENT_ORDER_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { ExportButton } from "@/components/shared/ExportButton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getPresetRange, type DateRange, type DateRangePreset } from "@/lib/dateRanges"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
})

type StatusFilter = PaymentOrderStatus | "ALL"

/**
 * Deposit ATTEMPTS (PaymentOrder), not confirmed deposits — a PENDING row
 * never reached the gateway's success callback, FAILED/EXPIRED never will.
 * The Deposits page (ledger.view) only ever shows money that actually
 * landed; this is the only place to see what didn't, for reconciliation
 * and spotting a broken/misconfigured payment flow before support tickets
 * pile up.
 */
function PaymentsPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [dateFilterOn, setDateFilterOn] = useState(false)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last7")
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("last7"))

  const queryParams = {
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined,
    dateFrom: dateFilterOn ? dateRange.dateFrom.toISOString() : undefined,
    dateTo: dateFilterOn ? dateRange.dateTo.toISOString() : undefined,
    limit: 50,
  }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["payments", queryParams],
    queryFn: ({ pageParam }: { pageParam?: string }) => listPaymentOrders({ ...queryParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []

  const activeFilters: ActiveFilter[] = []
  if (status !== "ALL") activeFilters.push({ key: "status", label: `Status: ${status}`, onClear: () => setStatus("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })
  if (dateFilterOn) activeFilters.push({ key: "date", label: "Date range", onClear: () => setDateFilterOn(false) })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Payment Attempts"
        description="Every deposit attempt, including ones that never went through — for reconciliation and spotting a broken payment flow."
        actions={<ExportButton module="payments" filters={queryParams} />}
      />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setStatus("ALL")
          setSearch("")
          setDateFilterOn(false)
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search player or gateway trx ID…" className="w-64" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        {dateFilterOn ? (
          <div className="flex items-center gap-1">
            <DateRangePicker preset={datePreset} value={dateRange} onChange={(range, preset) => { setDateRange(range); setDatePreset(preset) }} />
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setDateFilterOn(false)} aria-label="Clear date filter">
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setDateFilterOn(true)}>
            + Date range
          </Button>
        )}
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load payment attempts" onRetry={() => refetch()} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gateway Trx ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={6} />}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState icon={CreditCard} title="No payment attempts match these filters" />
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to="/users/$id"
                      params={{ id: item.player.id }}
                      className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {item.player.username}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(item.amount, item.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge config={PAYMENT_ORDER_STATUS_CONFIG} status={item.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.gatewayTrxId ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(item.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
