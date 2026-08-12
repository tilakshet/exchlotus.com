import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ScrollText } from "lucide-react"
import { listAuditLogs } from "@/api/audit.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit", debounced],
    queryFn: () => listAuditLogs({ entityType: debounced || undefined, limit: 100 }),
  })

  const activeFilters: ActiveFilter[] = entityType ? [{ key: "entityType", label: `Entity: ${entityType}`, onClear: () => setEntityType("") }] : []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Audit log" description="Every admin action that changed something — immutable, attributed, timestamped." />

      <FilterBar activeFilters={activeFilters} onClearAll={() => setEntityType("")}>
        <SearchInput value={entityType} onChange={setEntityType} placeholder="Filter by entity (Player, AdminUser, AdminRole…)" className="w-80" />
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
