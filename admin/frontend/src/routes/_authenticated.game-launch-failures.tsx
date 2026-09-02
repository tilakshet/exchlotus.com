import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { AlertOctagon, X } from "lucide-react"
import { getTopFailingGames, listLaunchFailures } from "@/api/game-launch-failures.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { ExportButton } from "@/components/shared/ExportButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getPresetRange, type DateRange, type DateRangePreset } from "@/lib/dateRanges"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/game-launch-failures")({
  component: GameLaunchFailuresPage,
})

/**
 * The direct answer to "why aren't some games starting" — previously a
 * launch failure only ever reached a stdout log line
 * (game-session.controller.ts), invisible unless someone was tailing
 * production logs at the exact moment it happened.
 */
function TopFailingGames() {
  const { data, isLoading } = useQuery({ queryKey: ["game-launch-failures", "top"], queryFn: getTopFailingGames })

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Most-failing games (last 7 days)</p>
      <div className="flex flex-wrap gap-2">
        {data.map((row) => (
          <Badge key={row.gameId} variant="destructive" className="font-mono">
            {row.gameId} · {row.count}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function GameLaunchFailuresPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [dateFilterOn, setDateFilterOn] = useState(false)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last7")
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("last7"))

  const queryParams = {
    search: debouncedSearch || undefined,
    dateFrom: dateFilterOn ? dateRange.dateFrom.toISOString() : undefined,
    dateTo: dateFilterOn ? dateRange.dateTo.toISOString() : undefined,
    limit: 50,
  }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["game-launch-failures", queryParams],
    queryFn: ({ pageParam }: { pageParam?: string }) => listLaunchFailures({ ...queryParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []

  const activeFilters: ActiveFilter[] = []
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })
  if (dateFilterOn) activeFilters.push({ key: "date", label: "Date range", onClear: () => setDateFilterOn(false) })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Game Launch Failures"
        description="Every time a player tried to launch a game and it didn't work — real-money mode mismatches and provider rejections."
        actions={<ExportButton module="game-launch-failures" filters={queryParams} />}
      />

      <TopFailingGames />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setDateFilterOn(false)
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search player or game ID…" className="w-64" />
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
        <ErrorState title="Unable to load launch failures" onRetry={() => refetch()} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Game ID</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={5} />}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState icon={AlertOctagon} title="No launch failures match these filters" description="Good sign — or try widening the date range." />
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
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.gameId}</TableCell>
                  <TableCell>
                    <Badge variant={item.mode === "real" ? "destructive" : "default"}>{item.mode}</Badge>
                  </TableCell>
                  <TableCell className="max-w-96 truncate text-muted-foreground" title={item.reason}>
                    {item.reason}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(item.createdAt)}</TableCell>
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
