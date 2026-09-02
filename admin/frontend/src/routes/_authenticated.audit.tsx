import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ScrollText, X } from "lucide-react"
import { listAuditLogs } from "@/api/audit.api"
import { listAdmins } from "@/api/admins.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getPresetRange, type DateRange, type DateRangePreset } from "@/lib/dateRanges"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
})

function ChangeSummary({ before, after }: { before: unknown; after: unknown }) {
  if (!before && !after) return <span className="text-muted-foreground">—</span>
  const text = [before ? `before: ${JSON.stringify(before)}` : null, after ? `after: ${JSON.stringify(after)}` : null].filter(Boolean).join(" · ")
  return (
    <span className="block max-w-72 truncate font-mono text-xs text-muted-foreground" title={text}>
      {text}
    </span>
  )
}

function AuditPage() {
  const [entityType, setEntityType] = useState("")
  const debounced = useDebouncedValue(entityType, 300)
  const [adminId, setAdminId] = useState<string>("ALL")
  const [dateFilterOn, setDateFilterOn] = useState(false)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last30")
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("last30"))

  // The admin-name filter dropdown needs its own admins.view permission —
  // an Auditor role has audit.view but not necessarily admins.view, so this
  // is gated separately rather than assuming every audit.view holder can
  // also list every admin account.
  const { hasPermission } = useAdminAuth()
  const { data: admins } = useQuery({ queryKey: ["admins", "all"], queryFn: listAdmins, enabled: hasPermission("admins.view") })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit", debounced, adminId, dateFilterOn, dateRange],
    queryFn: () =>
      listAuditLogs({
        entityType: debounced || undefined,
        adminId: adminId === "ALL" ? undefined : adminId,
        dateFrom: dateFilterOn ? dateRange.dateFrom.toISOString() : undefined,
        dateTo: dateFilterOn ? dateRange.dateTo.toISOString() : undefined,
        limit: 100,
      }),
  })

  const activeFilters: ActiveFilter[] = []
  if (entityType) activeFilters.push({ key: "entityType", label: `Entity: ${entityType}`, onClear: () => setEntityType("") })
  if (adminId !== "ALL") {
    const name = admins?.find((a) => a.id === adminId)
    activeFilters.push({ key: "admin", label: `Admin: ${name ? `${name.firstName} ${name.lastName}` : adminId}`, onClear: () => setAdminId("ALL") })
  }
  if (dateFilterOn) activeFilters.push({ key: "date", label: "Date range", onClear: () => setDateFilterOn(false) })

  function clearAll() {
    setEntityType("")
    setAdminId("ALL")
    setDateFilterOn(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Audit log" description="Every admin action that changed something — immutable, attributed, timestamped." />

      <FilterBar activeFilters={activeFilters} onClearAll={clearAll}>
        <SearchInput value={entityType} onChange={setEntityType} placeholder="Filter by entity (Player, AdminUser, AdminRole…)" className="w-72" />
        {hasPermission("admins.view") && (
          <Select value={adminId} onValueChange={setAdminId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All admins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All admins</SelectItem>
              {admins?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        <ErrorState title="Unable to load the audit log" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={7} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={ScrollText}
                    title={entityType ? "No audit entries match this filter" : "No audit entries yet"}
                    description={entityType ? undefined : "Actions like suspending a user or adjusting a wallet will show up here."}
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell>{log.adminName}</TableCell>
                <TableCell>
                  <Badge variant="default">{log.action}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.entityType}:{log.entityId.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <ChangeSummary before={log.before} after={log.after} />
                </TableCell>
                <TableCell className="text-muted-foreground">{log.reason ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{log.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
