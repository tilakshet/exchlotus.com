import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Users as UsersIcon } from "lucide-react"
import { listUsers } from "@/api/users.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge, USER_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/users/")({
  component: UsersPage,
})

type StatusFilter = "ACTIVE" | "SUSPENDED" | "ALL"

function UsersPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", debouncedSearch, status],
    queryFn: () => listUsers({ search: debouncedSearch || undefined, status: status === "ALL" ? undefined : status, limit: 50 }),
  })

  const activeFilters: ActiveFilter[] = []
  if (status !== "ALL") activeFilters.push({ key: "status", label: `Status: ${status}`, onClear: () => setStatus("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Users" description="Every registered player on the platform." />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setStatus("ALL")
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search username, email, phone…" className="w-72" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load users" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={6} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={UsersIcon}
                    title="No users match these filters"
                    description="Try clearing the search or status filter."
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link to="/users/$id" params={{ id: user.id }} className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                    {user.username}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{user.phone ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge config={USER_STATUS_CONFIG} status={user.status} />
                </TableCell>
                <TableCell className="tabular-nums">{user.balance !== null ? formatCurrency(user.balance, user.currency) : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
