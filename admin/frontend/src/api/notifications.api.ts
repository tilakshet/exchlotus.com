import { apiRequest } from "./http"

export interface NotificationItem {
  id: string
  action: string
  entityType: string
  entityId: string
  reason: string | null
  adminName: string
  createdAt: string
  read: boolean
}

export function listNotifications(params: { cursor?: string; limit?: number } = {}) {
  return apiRequest<{ items: NotificationItem[]; nextCursor: string | null }>("/admin-api/notifications", { query: params })
}

export function getUnreadNotificationCount() {
  return apiRequest<{ count: number }>("/admin-api/notifications/unread-count")
}

export function markNotificationsRead() {
  return apiRequest<void>("/admin-api/notifications/mark-read", { method: "POST" })
}
