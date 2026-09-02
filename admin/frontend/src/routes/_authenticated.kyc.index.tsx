import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import { listKycSubmissions, type KycStatus } from "@/api/kyc.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, KYC_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/kyc/")({
  component: KycListPage,
})

type StatusFilter = KycStatus | "ALL"

function KycListPage() {
  const [status, setStatus] = useState<StatusFilter>("PENDING")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kyc", status, debouncedSearch],
    queryFn: () => listKycSubmissions({ status: status === "ALL" ? undefined : status, search: debouncedSearch || undefined, limit: 100 }),
  })

  const activeFilters: ActiveFilter[] = []
  if (status !== "ALL") activeFilters.push({ key: "status", label: `Status: ${status}`, onClear: () => setStatus("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="KYC Verification" description="Player-submitted PAN and identity documents awaiting review." />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setStatus("ALL")
          setSearch("")
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search username, phone, or PAN…" className="w-64" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load KYC submissions" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={5} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={ShieldCheck} title="No KYC submissions match this filter" />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <Link to="/kyc/$id" params={{ id: item.id }} className="text-primary hover:underline">
                    {item.player.username}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.player.phone ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{item.panNumber}</TableCell>
                <TableCell>
                  <StatusBadge config={KYC_STATUS_CONFIG} status={item.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(item.submittedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
