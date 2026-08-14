import { apiRequest } from "./http"

export interface SystemStatus {
  database: { status: "ok" | "unreachable"; latencyMs: number | null }
  redis: { status: "ok" | "unreachable"; latencyMs: number | null }
  process: {
    uptimeSeconds: number
    memory: { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number }
  }
  activeAdminSessions: number
  checkedAt: string
}

export function getSystemStatus() {
  return apiRequest<SystemStatus>("/admin-api/monitoring/status")
}
