import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import { PERMISSION_CODES } from "../rbac/permissions"

const permissionsInclude = { permissions: { include: { permission: true } } } as const

function toSummary(role: { id: string; name: string; description: string | null; isSystem: boolean } & {
  permissions: { permission: { code: string } }[]
}) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((p) => p.permission.code),
  }
}

export async function listRoles() {
  const roles = await prisma.adminRole.findMany({ orderBy: { name: "asc" }, include: permissionsInclude })
  return roles.map(toSummary)
}

export async function listPermissions() {
  return prisma.adminPermission.findMany({ orderBy: { code: "asc" } })
}

export async function createRole(
  req: Request,
  actorAdminId: string,
  input: { name: string; description?: string; permissionCodes: string[] }
) {
  const existing = await prisma.adminRole.findUnique({ where: { name: input.name } })
  if (existing) throw new AdminApiError("EMAIL_TAKEN", `Role ${input.name} already exists`)

  const permissions = await prisma.adminPermission.findMany({ where: { code: { in: input.permissionCodes } } })

  return prisma.$transaction(async (tx) => {
    const role = await tx.adminRole.create({
      data: {
        name: input.name,
        description: input.description,
        isSystem: false,
        permissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
      include: permissionsInclude,
    })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "role.create",
      entityType: "AdminRole",
      entityId: role.id,
      after: { name: role.name, permissions: input.permissionCodes },
    })
    return toSummary(role)
  })
}

export async function updateRolePermissions(req: Request, actorAdminId: string, roleId: string, permissionCodes: string[]) {
  const role = await prisma.adminRole.findUnique({ where: { id: roleId }, include: permissionsInclude })
  if (!role) throw new AdminApiError("NOT_FOUND", "Role not found")

  const validCodes = permissionCodes.filter((code) => (PERMISSION_CODES as readonly string[]).includes(code))
  const permissions = await prisma.adminPermission.findMany({ where: { code: { in: validCodes } } })
  const before = role.permissions.map((p) => p.permission.code)

  return prisma.$transaction(async (tx) => {
    await tx.adminRolePermission.deleteMany({ where: { roleId } })
    await tx.adminRolePermission.createMany({ data: permissions.map((p) => ({ roleId, permissionId: p.id })) })
    const updated = await tx.adminRole.findUniqueOrThrow({ where: { id: roleId }, include: permissionsInclude })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "role.permissions_changed",
      entityType: "AdminRole",
      entityId: roleId,
      before: { permissions: before },
      after: { permissions: validCodes },
    })
    return toSummary(updated)
  })
}

export async function deleteRole(req: Request, actorAdminId: string, roleId: string) {
  const role = await prisma.adminRole.findUnique({ where: { id: roleId } })
  if (!role) throw new AdminApiError("NOT_FOUND", "Role not found")
  if (role.isSystem) throw new AdminApiError("SYSTEM_ROLE_IMMUTABLE", "Built-in roles cannot be deleted — edit their permissions instead")

  const assignedCount = await prisma.adminUser.count({ where: { roleId } })
  if (assignedCount > 0) throw new AdminApiError("FORBIDDEN", "Reassign every admin off this role before deleting it")

  return prisma.$transaction(async (tx) => {
    await tx.adminRole.delete({ where: { id: roleId } })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "role.delete",
      entityType: "AdminRole",
      entityId: roleId,
      before: { name: role.name },
    })
  })
}
