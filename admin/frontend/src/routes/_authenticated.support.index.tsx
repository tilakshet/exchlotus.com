import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { LifeBuoy } from "lucide-react"
import { listTickets, type SupportTicketStatus } from "@/api/support.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, TICKET_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/support/")({
  component: SupportPage,
})

type StatusFilter = SupportTicketStatus | "ALL"

function SupportPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("OPEN")
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-tickets", debouncedSearch, status],
    queryFn: () => listTickets({ search: debouncedSearch || undefined, status: status === "ALL" ? undefined : status, limit: 50 }),
  })

  const activeFilters: ActiveFilter[] = []
  if (status !== "ALL") activeFilters.push({ key: "status", label: `Status: ${status}`, onClear: () => setStatus("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Support" description="Player-raised queries — reply and update status without leaving the conversation." />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setStatus("ALL")
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search subject, username, player ID…" className="w-72" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load support tickets" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={5} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={LifeBuoy} title="No tickets match these filters" description="Try clearing the search or status filter." />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Link
                    to="/support/$id"
                    params={{ id: ticket.id }}
                    className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{ticket.player.username}</TableCell>
                <TableCell>
                  <StatusBadge config={TICKET_STATUS_CONFIG} status={ticket.status} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{ticket.messageCount}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(ticket.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
