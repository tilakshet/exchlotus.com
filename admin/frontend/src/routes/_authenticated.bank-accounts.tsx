import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { AlertTriangle, BookUser } from "lucide-react"
import { listBankAccounts } from "@/api/bank-accounts.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { ExportButton } from "@/components/shared/ExportButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/bank-accounts")({
  component: BankAccountsPage,
})

/**
 * Previously only ever visible one row at a time, embedded inside a
 * withdrawal request — no way to search "does this player have a saved
 * bank account" or spot the same account number saved against multiple
 * players (see bank-accounts.service.ts sharedWithOtherPlayers), a real
 * payout-fraud signal.
 */
function BankAccountsPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const queryParams = { search: debouncedSearch || undefined, limit: 50 }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["bank-accounts", queryParams],
    queryFn: ({ pageParam }: { pageParam?: string }) => listBankAccounts({ ...queryParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []

  const activeFilters: ActiveFilter[] = search ? [{ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") }] : []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Bank Accounts"
        description="Every bank account players have saved for withdrawals — search across all of them, not just one withdrawal at a time."
        actions={<ExportButton module="bank-accounts" filters={queryParams} />}
      />

      <FilterBar activeFilters={activeFilters} onClearAll={() => setSearch("")}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search player, account holder, bank, account number, IFSC…" className="w-96" />
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load bank accounts" onRetry={() => refetch()} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Account holder</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account number</TableHead>
                <TableHead>IFSC</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={7} />}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState icon={BookUser} title="No bank accounts match this search" />
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
                  <TableCell className="text-muted-foreground">{item.accountHolderName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.bankName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">····{item.accountNumber.slice(-4)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.ifsc}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>
                    {item.sharedWithOtherPlayers && (
                      <Badge variant="destructive" title="This exact account number is saved against more than one player account">
                        <AlertTriangle className="size-3" />
                        Shared
                      </Badge>
                    )}
                  </TableCell>
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
