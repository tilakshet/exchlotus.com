import { useCallback, useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { listGlobalLedger, type GlobalLedgerItem, type LedgerEntryType } from "@/api/ledger.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, LEDGER_TYPE_CONFIG } from "@/components/shared/StatusBadge"
import { ExportButton } from "@/components/shared/ExportButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getPresetRange, type DateRange, type DateRangePreset } from "@/lib/dateRanges"
import { formatCurrency, formatDateTime } from "@/lib/utils"

interface LedgerFilters {
  search: string
  dateFilterOn: boolean
  datePreset: DateRangePreset
  dateRange: DateRange
  minAmount: string
  maxAmount: string
}

function toParams(types: LedgerEntryType[], f: LedgerFilters) {
  return {
    type: types,
    search: f.search || undefined,
    dateFrom: f.dateFilterOn ? f.dateRange.dateFrom.toISOString() : undefined,
    dateTo: f.dateFilterOn ? f.dateRange.dateTo.toISOString() : undefined,
    minAmount: f.minAmount ? Number(f.minAmount) : undefined,
    maxAmount: f.maxAmount ? Number(f.maxAmount) : undefined,
  }
}

/**
 * Backs deposits/withdrawals/transactions (item 2) and bets/game-activity
 * (item 4) — same LedgerEntry data and `ledger.view` permission, just a
 * different fixed `type` filter and empty-state copy per page. Locking
 * `types` (rather than exposing a type picker) keeps each page a clear,
 * single-purpose view instead of one generic "all ledger entries" screen.
 *
 * Loads pages manually (not a flat single fetch) — a busy player/period can
 * easily have more than one page's worth of entries, and there used to be
 * no way to see past the first 50.
 */
export function LedgerList({
  title,
  description,
  icon,
  types,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  icon: LucideIcon
  types: LedgerEntryType[]
  emptyTitle: string
  emptyDescription: string
}) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [dateFilterOn, setDateFilterOn] = useState(false)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last7")
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("last7"))
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const debouncedMin = useDebouncedValue(minAmount, 400)
  const debouncedMax = useDebouncedValue(maxAmount, 400)

  const filters: LedgerFilters = { search: debouncedSearch, dateFilterOn, datePreset, dateRange, minAmount: debouncedMin, maxAmount: debouncedMax }
  const filterKey = JSON.stringify(toParams(types, filters))

  const [items, setItems] = useState<GlobalLedgerItem[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const loadFirstPage = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const page = await listGlobalLedger({ ...toParams(types, filters), limit: 50 })
      setItems(page.items)
      setCursor(page.nextCursor)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const page = await listGlobalLedger({ ...toParams(types, filters), cursor, limit: 50 })
      setItems((prev) => [...(prev ?? []), ...page.items])
      setCursor(page.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  const activeFilters: ActiveFilter[] = []
  if (search) activeFilters.push({ key: "search", label: `Player: ${search}`, onClear: () => setSearch("") })
  if (dateFilterOn) activeFilters.push({ key: "date", label: "Date range", onClear: () => setDateFilterOn(false) })
  if (minAmount) activeFilters.push({ key: "min", label: `Min ${minAmount}`, onClear: () => setMinAmount("") })
  if (maxAmount) activeFilters.push({ key: "max", label: `Max ${maxAmount}`, onClear: () => setMaxAmount("") })

  function clearAll() {
    setSearch("")
    setDateFilterOn(false)
    setMinAmount("")
    setMaxAmount("")
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          <ExportButton
            module="ledger"
            filters={{
              type: types.join(","),
              search: filters.search || undefined,
              dateFrom: filters.dateFilterOn ? filters.dateRange.dateFrom.toISOString() : undefined,
              dateTo: filters.dateFilterOn ? filters.dateRange.dateTo.toISOString() : undefined,
              minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
              maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
            }}
          />
        }
      />

      <FilterBar activeFilters={activeFilters} onClearAll={clearAll}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search username or player ID…" className="w-64" />

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

        <div className="flex items-center gap-1.5">
          <Input type="number" placeholder="Min amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-28" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="number" placeholder="Max amount" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-28" />
        </div>
      </FilterBar>

      {error ? (
        <ErrorState title={`Unable to load ${title.toLowerCase()}`} onRetry={loadFirstPage} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance after</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableSkeletonRows columns={7} />}
              {!loading && items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
                  </TableCell>
                </TableRow>
              )}
              {items?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    <Link
                      to="/users/$id"
                      params={{ id: entry.player.id }}
                      className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {entry.player.username}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge config={LEDGER_TYPE_CONFIG} status={entry.type} />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(entry.amount, entry.player.currency)}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(entry.balanceAfter, entry.player.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.gameId === "wallet" ? "—" : entry.gameId}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground" title={entry.transactionId}>
                    {entry.transactionId.slice(0, 12)}…
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {cursor && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
