import { apiRequest } from "./http"

export interface AuditLogItem {
  id: string
  adminId: string
  adminEmail: string
  adminName: string
  action: string
  entityType: string
  entityId: string
  before: unknown
  after: unknown
  reason: string | null
  ipAddress: string
  requestId: string
  createdAt: string
}

export function listAuditLogs(params: {
  adminId?: string
  entityType?: string
  entityId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  cursor?: string
  limit?: number
}) {
  return apiRequest<{ items: AuditLogItem[]; nextCursor: string | null }>("/admin-api/audit", { query: params })
}
