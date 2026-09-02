import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { KeyRound, X } from "lucide-react"
import { listLoginEvents, type LoginEventMethod, type LoginEventResult } from "@/api/login-events.api"
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

export const Route = createFileRoute("/_authenticated/login-activity")({
  component: LoginActivityPage,
})

const RESULT_LABEL: Record<LoginEventResult, string> = { SUCCESS: "Success", FAILURE: "Failure" }
const METHOD_LABEL: Record<LoginEventMethod, string> = { PASSWORD: "Password", OTP: "OTP", REGISTER: "Sign up" }

function LoginActivityPage() {
  const [search, setSearch] = useState("")
  const [result, setResult] = useState<LoginEventResult | "">("")
  const [method, setMethod] = useState<LoginEventMethod | "">("")
  const [dateFilterOn, setDateFilterOn] = useState(false)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last7")
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("last7"))
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["login-events", debouncedSearch, result, method, dateFilterOn, dateRange],
    queryFn: () =>
      listLoginEvents({
        search: debouncedSearch || undefined,
        result: result || undefined,
        method: method || undefined,
        dateFrom: dateFilterOn ? dateRange.dateFrom.toISOString() : undefined,
        dateTo: dateFilterOn ? dateRange.dateTo.toISOString() : undefined,
        limit: 100,
      }),
  })

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") }] : []),
    ...(result ? [{ key: "result", label: `Result: ${RESULT_LABEL[result]}`, onClear: () => setResult("") }] : []),
    ...(method ? [{ key: "method", label: `Method: ${METHOD_LABEL[method]}`, onClear: () => setMethod("") }] : []),
    ...(dateFilterOn ? [{ key: "date", label: "Date range", onClear: () => setDateFilterOn(false) }] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Login activity" description="Every login and sign-up attempt, success and failure — IP/device tracking and anomaly detection input." />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setResult("")
          setMethod("")
          setDateFilterOn(false)
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search username or phone…" className="w-64" />
        <Select value={result || "all"} onValueChange={(v) => setResult(v === "all" ? "" : (v as LoginEventResult))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILURE">Failure</SelectItem>
          </SelectContent>
        </Select>
        <Select value={method || "all"} onValueChange={(v) => setMethod(v === "all" ? "" : (v as LoginEventMethod))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="PASSWORD">Password</SelectItem>
            <SelectItem value="OTP">OTP</SelectItem>
            <SelectItem value="REGISTER">Sign up</SelectItem>
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
        <ErrorState title="Unable to load login activity" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={8} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={KeyRound}
                    title={search || result || method ? "No login attempts match this filter" : "No login activity yet"}
                    description={search || result || method ? undefined : "Player logins and sign-ups will show up here as they happen."}
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(event.createdAt)}</TableCell>
                <TableCell>
                  {event.playerId && event.playerUsername ? (
                    <Link to="/users/$id" params={{ id: event.playerId }} className="text-primary hover:underline">
                      {event.playerUsername}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{event.phone}</TableCell>
                <TableCell>{METHOD_LABEL[event.method]}</TableCell>
                <TableCell>
                  <Badge variant={event.result === "SUCCESS" ? "success" : "destructive"}>{RESULT_LABEL[event.result]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{event.reason ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{event.ipAddress ?? "—"}</TableCell>
                <TableCell className="max-w-56 truncate text-xs text-muted-foreground" title={event.userAgent ?? undefined}>
                  {event.userAgent ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
