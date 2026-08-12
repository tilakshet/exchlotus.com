import { apiRequest } from "./http"

export interface AdminSummary {
  id: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  roleName: string
  mfaEnabled: boolean
  status: "ACTIVE" | "DISABLED"
  lastLoginAt: string | null
  createdAt: string
}

export function listAdmins() {
  return apiRequest<AdminSummary[]>("/admin-api/admins")
}

export function createAdmin(input: { email: string; password: string; firstName: string; lastName: string; roleId: string }) {
  return apiRequest<AdminSummary>("/admin-api/admins", { method: "POST", body: input })
}

export function updateAdminRole(id: string, roleId: string) {
  return apiRequest<AdminSummary>(`/admin-api/admins/${id}/role`, { method: "PATCH", body: { roleId } })
}

export function setAdminEnabled(id: string, enabled: boolean) {
  return apiRequest<AdminSummary>(`/admin-api/admins/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" })
}

export function resetAdminMfa(id: string) {
  return apiRequest<void>(`/admin-api/admins/${id}/reset-mfa`, { method: "POST" })
}
