import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Activity, Clock, Database, HardDrive, ShieldCheck, Zap } from "lucide-react"
import { getSystemStatus } from "@/api/monitoring.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { ErrorState } from "@/components/shared/ErrorState"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/monitoring")({
  component: MonitoringPage,
})

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function MonitoringPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["monitoring-status"],
    queryFn: getSystemStatus,
    refetchInterval: 15_000,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="System monitoring"
        description={data ? `Checked ${formatDateTime(data.checkedAt)} — refreshes every 15s` : undefined}
      />

      {isLoading && <CardSkeletonGrid count={4} />}
      {isError && <ErrorState title="Unable to load system status" onRetry={() => refetch()} />}

      {data && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              icon={Database}
              label="Database"
              value={data.database.status === "ok" ? `${data.database.latencyMs} ms` : "Unreachable"}
              hint={data.database.status === "ok" ? "Round-trip latency" : "Query failed"}
            />
            <MetricCard
              icon={Zap}
              label="Redis"
              value={data.redis.status === "ok" ? `${data.redis.latencyMs} ms` : "Unreachable"}
              hint={data.redis.status === "ok" ? "Round-trip latency" : "Ping failed — rate limiting fails open"}
            />
            <MetricCard icon={Clock} label="Process uptime" value={formatUptime(data.process.uptimeSeconds)} hint="Since last restart" />
            <MetricCard icon={ShieldCheck} label="Active admin sessions" value={data.activeAdminSessions.toLocaleString()} />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={HardDrive} label="Heap used" value={formatBytes(data.process.memory.heapUsed)} hint={`of ${formatBytes(data.process.memory.heapTotal)} heap total`} />
            <MetricCard icon={Activity} label="RSS" value={formatBytes(data.process.memory.rss)} hint="Total resident memory" />
          </section>
        </>
      )}
    </div>
  )
}
