import type { Request } from "express"
import { prisma } from "../../lib/prisma"
import { writeAuditLog } from "../../lib/audit"
import { AdminApiError } from "../../lib/api-error"
import { hashPassword } from "../auth/password.util"
import type { Prisma } from "../../generated/prisma"

const roleInclude = { role: true } as const
type AdminWithRole = Prisma.AdminUserGetPayload<{ include: typeof roleInclude }>

export async function listAdmins() {
  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "desc" }, include: roleInclude })
  return admins.map(toSummary)
}

export async function getAdmin(id: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id }, include: roleInclude })
  if (!admin) throw new AdminApiError("NOT_FOUND", "Admin not found")
  return toSummary(admin)
}

function toSummary(admin: AdminWithRole) {
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    roleId: admin.roleId,
    roleName: admin.role.name,
    mfaEnabled: admin.mfaEnabled,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
  }
}

export async function createAdmin(
  req: Request,
  actorAdminId: string,
  input: { email: string; password: string; firstName: string; lastName: string; roleId: string }
) {
  const existing = await prisma.adminUser.findUnique({ where: { email: input.email } })
  if (existing) throw new AdminApiError("EMAIL_TAKEN", `${input.email} is already an admin account`)

  const role = await prisma.adminRole.findUnique({ where: { id: input.roleId } })
  if (!role) throw new AdminApiError("NOT_FOUND", "Role not found")

  const passwordHash = await hashPassword(input.password)

  return prisma.$transaction(async (tx) => {
    const admin = await tx.adminUser.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId,
      },
      include: roleInclude,
    })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "admin.create",
      entityType: "AdminUser",
      entityId: admin.id,
      after: { email: admin.email, roleName: role.name },
    })
    return toSummary(admin)
  })
}

async function assertNotLastActiveSuperAdmin(targetRoleName: string) {
  if (targetRoleName !== "SUPER_ADMIN") return
  const activeSuperAdmins = await prisma.adminUser.count({
    where: { status: "ACTIVE", role: { name: "SUPER_ADMIN" } },
  })
  if (activeSuperAdmins <= 1) {
    throw new AdminApiError("FORBIDDEN", "Cannot disable/reassign the last active Super Admin — the platform must always have at least one")
  }
}

export async function updateAdminRole(req: Request, actorAdminId: string, id: string, roleId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id }, include: roleInclude })
  if (!admin) throw new AdminApiError("NOT_FOUND", "Admin not found")
  const newRole = await prisma.adminRole.findUnique({ where: { id: roleId } })
  if (!newRole) throw new AdminApiError("NOT_FOUND", "Role not found")

  await assertNotLastActiveSuperAdmin(admin.role.name)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.adminUser.update({ where: { id }, data: { roleId }, include: roleInclude })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "admin.role_changed",
      entityType: "AdminUser",
      entityId: id,
      before: { roleName: admin.role.name },
      after: { roleName: newRole.name },
    })
    return toSummary(updated)
  })
}

export async function setAdminStatus(req: Request, actorAdminId: string, id: string, status: "ACTIVE" | "DISABLED") {
  if (id === actorAdminId) {
    throw new AdminApiError("FORBIDDEN", "You cannot change your own account status")
  }
  const admin = await prisma.adminUser.findUnique({ where: { id }, include: roleInclude })
  if (!admin) throw new AdminApiError("NOT_FOUND", "Admin not found")

  if (status === "DISABLED") {
    await assertNotLastActiveSuperAdmin(admin.role.name)
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.adminUser.update({ where: { id }, data: { status }, include: roleInclude })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: status === "DISABLED" ? "admin.disable" : "admin.enable",
      entityType: "AdminUser",
      entityId: id,
      before: { status: admin.status },
      after: { status },
    })
    return toSummary(updated)
  })
}

export async function resetAdminMfa(req: Request, actorAdminId: string, id: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id } })
  if (!admin) throw new AdminApiError("NOT_FOUND", "Admin not found")

  return prisma.$transaction(async (tx) => {
    await tx.adminUser.update({ where: { id }, data: { mfaEnabled: false, mfaSecret: null } })
    // Also revoke every existing session — a targeted MFA reset (e.g. lost
    // device, suspected compromise) should not leave old sessions usable.
    await tx.adminSession.updateMany({ where: { adminId: id, revokedAt: null }, data: { revokedAt: new Date() } })
    await writeAuditLog(tx, req, {
      adminId: actorAdminId,
      action: "admin.mfa_reset",
      entityType: "AdminUser",
      entityId: id,
      reason: "MFA reset by administrator",
    })
  })
}
