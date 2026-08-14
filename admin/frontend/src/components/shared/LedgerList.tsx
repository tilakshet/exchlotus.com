import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import { listGlobalLedger, type LedgerEntryType } from "@/api/ledger.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, LEDGER_TYPE_CONFIG } from "@/components/shared/StatusBadge"
import { ExportButton } from "@/components/shared/ExportButton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatCurrency, formatDateTime } from "@/lib/utils"

/**
 * Backs deposits/withdrawals/transactions (item 2) and bets/game-activity
 * (item 4) — same LedgerEntry data and `ledger.view` permission, just a
 * different fixed `type` filter and empty-state copy per page. Locking
 * `types` (rather than exposing a type picker) keeps each page a clear,
 * single-purpose view instead of one generic "all ledger entries" screen.
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ledger", types.join(","), debouncedSearch],
    queryFn: () => listGlobalLedger({ type: types, search: debouncedSearch || undefined, limit: 50 }),
  })

  const activeFilters: ActiveFilter[] = search ? [{ key: "search", label: `Player: ${search}`, onClear: () => setSearch("") }] : []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={description}
        actions={<ExportButton module="ledger" filters={{ type: types.join(","), search: debouncedSearch || undefined }} />}
      />

      <FilterBar activeFilters={activeFilters} onClearAll={() => setSearch("")}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search username or player ID…" className="w-72" />
      </FilterBar>

      {isError ? (
        <ErrorState title={`Unable to load ${title.toLowerCase()}`} onRetry={() => refetch()} />
      ) : (
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
            {isLoading && <TableSkeletonRows columns={7} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((entry) => (
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
      )}
    </div>
  )
}
