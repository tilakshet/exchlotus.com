import { prisma } from "../../lib/prisma"
import { AdminApiError } from "../../lib/api-error"
import { hashPassword, verifyPassword } from "./password.util"
import { generateRefreshToken, hashRefreshToken, signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken } from "./token.util"
import { generateMfaSecret, mfaKeyUri, verifyMfaCode } from "./mfa.util"
import type { AdminAuthContext, AdminAuthTokens } from "./admin-auth.types"

const adminWithRoleInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} as const

type AdminWithRole = Awaited<ReturnType<typeof loadAdminWithRole>>

async function loadAdminWithRole(adminId: string) {
  return prisma.adminUser.findUnique({ where: { id: adminId }, include: adminWithRoleInclude })
}

function toPermissionCodes(admin: NonNullable<AdminWithRole>): string[] {
  return admin.role.permissions.map((rp) => rp.permission.code)
}

async function issueSession(
  admin: NonNullable<AdminWithRole>,
  ip: string,
  userAgent: string,
  mfaVerified: boolean
): Promise<AdminAuthTokens> {
  const refresh = generateRefreshToken()
  const session = await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      ipAddress: ip,
      userAgent,
      mfaVerified,
    },
  })
  const { token: accessToken, expiresIn } = signAccessToken({ sub: admin.id, sessionId: session.id, email: admin.email })
  return { accessToken, refreshToken: refresh.token, expiresIn }
}

export async function login(
  email: string,
  password: string,
  ip: string,
  userAgent: string
): Promise<AdminAuthTokens | { mfaRequired: true; challengeToken: string }> {
  const admin = await prisma.adminUser.findUnique({ where: { email }, include: adminWithRoleInclude })
  if (!admin) {
    throw new AdminApiError("INVALID_CREDENTIALS", "Invalid email or password")
  }
  if (admin.status !== "ACTIVE") {
    throw new AdminApiError("ADMIN_DISABLED", "This admin account has been disabled")
  }

  const valid = await verifyPassword(password, admin.passwordHash)
  if (!valid) {
    throw new AdminApiError("INVALID_CREDENTIALS", "Invalid email or password")
  }

  if (admin.mfaEnabled) {
    return { mfaRequired: true, challengeToken: signMfaChallengeToken(admin.id) }
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
  return issueSession(admin, ip, userAgent, true)
}

export async function verifyMfaLogin(challengeToken: string, code: string, ip: string, userAgent: string): Promise<AdminAuthTokens> {
  let adminId: string
  try {
    adminId = verifyMfaChallengeToken(challengeToken).sub
  } catch {
    throw new AdminApiError("INVALID_TOKEN", "MFA challenge expired or invalid — log in again")
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, include: adminWithRoleInclude })
  if (!admin || admin.status !== "ACTIVE") {
    throw new AdminApiError("ADMIN_DISABLED", "This admin account is unavailable")
  }
  if (!admin.mfaEnabled || !admin.mfaSecret) {
    throw new AdminApiError("MFA_NOT_ENROLLED", "MFA is not enrolled on this account")
  }
  if (!verifyMfaCode(code, admin.mfaSecret)) {
    throw new AdminApiError("MFA_INVALID", "Incorrect authenticator code")
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
  return issueSession(admin, ip, userAgent, true)
}

export async function refresh(refreshToken: string, ip: string, userAgent: string): Promise<AdminAuthTokens> {
  const hash = hashRefreshToken(refreshToken)
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: hash } })

  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.mfaVerified) {
    throw new AdminApiError("INVALID_REFRESH_TOKEN", "Session is invalid, expired, or already used")
  }

  const admin = await loadAdminWithRole(session.adminId)
  if (!admin || admin.status !== "ACTIVE") {
    throw new AdminApiError("ADMIN_DISABLED", "This admin account is unavailable")
  }

  // Single-use, same as backend/'s player refresh rotation: a stolen and
  // replayed refresh token stops working the instant the real client
  // refreshes once more.
  await prisma.adminSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } })

  return issueSession(admin, ip, userAgent, true)
}

export async function logout(refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken)
  await prisma.adminSession.updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } })
}

/** Used by requireAdminAuth on every request — see admin-auth.middleware.ts. */
export async function loadAuthContext(adminId: string, sessionId: string): Promise<AdminAuthContext | null> {
  const session = await prisma.adminSession.findUnique({ where: { id: sessionId } })
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.mfaVerified || session.adminId !== adminId) {
    return null
  }

  const admin = await loadAdminWithRole(adminId)
  if (!admin || admin.status !== "ACTIVE") return null

  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    roleId: admin.roleId,
    roleName: admin.role.name,
    permissions: toPermissionCodes(admin),
    sessionId: session.id,
  }
}

export async function beginMfaEnrollment(adminId: string): Promise<{ secret: string; otpauthUrl: string }> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } })
  if (!admin) throw new AdminApiError("NOT_FOUND", "Admin not found")
  if (admin.mfaEnabled) throw new AdminApiError("MFA_ALREADY_ENABLED", "MFA is already enabled — disable it first to re-enroll")

  const secret = generateMfaSecret()
  await prisma.adminUser.update({ where: { id: adminId }, data: { mfaSecret: secret } })
  return { secret, otpauthUrl: mfaKeyUri(admin.email, secret) }
}

export async function confirmMfaEnrollment(adminId: string, code: string): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } })
  if (!admin?.mfaSecret) throw new AdminApiError("MFA_NOT_ENROLLED", "Call /mfa/enroll first")
  if (!verifyMfaCode(code, admin.mfaSecret)) throw new AdminApiError("MFA_INVALID", "Incorrect authenticator code")

  await prisma.adminUser.update({ where: { id: adminId }, data: { mfaEnabled: true } })
}

export async function disableMfa(adminId: string, password: string): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } })
  if (!admin) throw new AdminApiError("NOT_FOUND", "Admin not found")
  const valid = await verifyPassword(password, admin.passwordHash)
  if (!valid) throw new AdminApiError("INVALID_CREDENTIALS", "Incorrect password")

  await prisma.adminUser.update({ where: { id: adminId }, data: { mfaEnabled: false, mfaSecret: null } })
}

export { hashPassword }
