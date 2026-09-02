import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Banknote, Check, Landmark, X } from "lucide-react"
import { approveWithdrawal, listWithdrawals, rejectWithdrawal, type WithdrawalItem } from "@/api/withdrawals.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { ApiError } from "@/api/api-error"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, WITHDRAWAL_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ExportButton } from "@/components/shared/ExportButton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getPresetRange, type DateRange, type DateRangePreset } from "@/lib/dateRanges"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/withdrawals")({
  component: WithdrawalsPage,
})

type StatusFilter = WithdrawalItem["status"] | "ALL"

function WithdrawalActions({ item }: { item: WithdrawalItem }) {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["withdrawals"] })

  const approveMutation = useMutation({
    mutationFn: () => approveWithdrawal(item.id),
    onSuccess: () => {
      invalidate()
      toast({ title: "Withdrawal approved", description: `${item.username} · ${formatCurrency(item.amount, "INR")}`, variant: "success" })
    },
    onError: (err) => toast({ title: "Approval failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectWithdrawal(item.id, reason),
    onSuccess: () => {
      setRejectOpen(false)
      invalidate()
      toast({ title: "Withdrawal rejected", description: item.username, variant: "success" })
    },
    onError: (err) => toast({ title: "Rejection failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (!hasPermission("withdrawals.approve") || item.status !== "PENDING") return null

  return (
    <div className="flex gap-1.5">
      <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending || rejectMutation.isPending}>
        <Check className="size-3.5" />
        {approveMutation.isPending ? "Approving…" : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setRejectOpen(true)}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        <X className="size-3.5" />
        Reject
      </Button>
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ${item.username}'s withdrawal?`}
        description={`${formatCurrency(item.amount, "INR")} is released back to their available balance. This is recorded in the audit log.`}
        confirmLabel="Reject withdrawal"
        variant="destructive"
        requireReason
        loading={rejectMutation.isPending}
        onConfirm={(reason) => rejectMutation.mutate(reason!)}
      />
    </div>
  )
}

function WithdrawalsPage() {
  const [status, setStatus] = useState<StatusFilter>("PENDING")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [dateFilterOn, setDateFilterOn] = useState(false)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last30")
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("last30"))

  const queryParams = {
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined,
    dateFrom: dateFilterOn ? dateRange.dateFrom.toISOString() : undefined,
    dateTo: dateFilterOn ? dateRange.dateTo.toISOString() : undefined,
    limit: 50,
  }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["withdrawals", queryParams],
    queryFn: ({ pageParam }: { pageParam?: string }) => listWithdrawals({ ...queryParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []

  const activeFilters: ActiveFilter[] = []
  if (status !== "ALL") activeFilters.push({ key: "status", label: `Status: ${status}`, onClear: () => setStatus("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })
  if (dateFilterOn) activeFilters.push({ key: "date", label: "Date range", onClear: () => setDateFilterOn(false) })

  function clearAll() {
    setStatus("ALL")
    setSearch("")
    setDateFilterOn(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Withdrawals"
        description="Player payout requests awaiting review, and their outcomes."
        actions={<ExportButton module="withdrawals" filters={queryParams} />}
      />

      <FilterBar activeFilters={activeFilters} onClearAll={clearAll}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search player or account holder…" className="w-64" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending review</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
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
        <ErrorState title="Unable to load withdrawals" onRetry={() => refetch()} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={6} />}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState icon={Banknote} title="No withdrawals match this filter" />
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.username}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(item.amount, "INR")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Landmark className="size-3.5 shrink-0" aria-hidden="true" />
                      {item.bankAccount.accountHolderName} · {item.bankAccount.bankName} · ····{item.bankAccount.accountNumber.slice(-4)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge config={WITHDRAWAL_STATUS_CONFIG} status={item.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(item.requestedAt)}</TableCell>
                  <TableCell>
                    <WithdrawalActions item={item} />
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
