import { apiRequest } from "./http"

export interface RoleSummary {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
}

export interface PermissionRecord {
  id: string
  code: string
  description: string | null
}

export function listRoles() {
  return apiRequest<RoleSummary[]>("/admin-api/roles")
}

export function listPermissions() {
  return apiRequest<PermissionRecord[]>("/admin-api/roles/permissions")
}

export function updateRolePermissions(roleId: string, permissionCodes: string[]) {
  return apiRequest<RoleSummary>(`/admin-api/roles/${roleId}/permissions`, { method: "PATCH", body: { permissionCodes } })
}

export function createRole(input: { name: string; description?: string; permissionCodes: string[] }) {
  return apiRequest<RoleSummary>("/admin-api/roles", { method: "POST", body: input })
}
