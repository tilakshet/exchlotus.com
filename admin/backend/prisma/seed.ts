import { env } from "../src/lib/env"
import { prisma } from "../src/lib/prisma"
import { hashPassword } from "../src/modules/auth/password.util"
import { PERMISSION_CODES } from "../src/modules/rbac/permissions"

/**
 * System roles (isSystem: true) can't be deleted from the admin UI — only
 * their permission set can be edited. Matches the RBAC matrix in the
 * architecture report; KYC/SECURITY/RISK roles are intentionally not
 * seeded yet — those modules don't exist in this Tier-1 build, so an empty
 * placeholder role would have nothing real to grant.
 */
const ROLE_DEFINITIONS: { name: string; description: string; permissions: readonly string[] }[] = [
  { name: "SUPER_ADMIN", description: "Full platform access, including admin/role management.", permissions: PERMISSION_CODES },
  {
    name: "MANAGER",
    description: "Operational oversight — users, wallets (view only), ledger, games, reports, monitoring.",
    permissions: [
      "dashboard.view",
      "users.view",
      "users.suspend",
      "wallets.view",
      "ledger.view",
      "games.view",
      "games.manage",
      "reports.view",
      "monitoring.view",
      "notifications.view",
      "users.export",
      "ledger.export",
      "games.export",
      "reports.export",
    ],
  },
  {
    name: "FINANCE",
    description: "Wallet adjustments, deposits/withdrawals, ledger, reports.",
    permissions: [
      "dashboard.view",
      "users.view",
      "wallets.view",
      "wallets.adjust",
      "ledger.view",
      "games.view",
      "reports.view",
      "notifications.view",
      "ledger.export",
      "reports.export",
    ],
  },
  {
    name: "SUPPORT",
    description: "Read-only user/wallet lookup for handling support tickets.",
    permissions: ["dashboard.view", "users.view", "wallets.view", "ledger.view", "games.view", "notifications.view"],
  },
  {
    name: "AUDITOR",
    description: "Read-only across users/wallets/ledger/games/reports/monitoring, plus the audit trail.",
    permissions: [
      "dashboard.view",
      "users.view",
      "wallets.view",
      "ledger.view",
      "audit.view",
      "games.view",
      "reports.view",
      "monitoring.view",
      "notifications.view",
      "users.export",
      "ledger.export",
      "games.export",
      "reports.export",
    ],
  },
]

async function main() {
  await prisma.adminPermission.createMany({
    data: PERMISSION_CODES.map((code) => ({ code })),
    skipDuplicates: true,
  })
  const allPermissions = await prisma.adminPermission.findMany()
  const permissionIdByCode = new Map(allPermissions.map((p) => [p.code, p.id]))

  for (const def of ROLE_DEFINITIONS) {
    const role = await prisma.adminRole.upsert({
      where: { name: def.name },
      update: { description: def.description, isSystem: true },
      create: { name: def.name, description: def.description, isSystem: true },
    })

    await prisma.adminRolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.adminRolePermission.createMany({
      data: def.permissions
        .map((code) => permissionIdByCode.get(code))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
    })
  }

  const existingAdminCount = await prisma.adminUser.count()
  if (existingAdminCount === 0) {
    const superAdminRole = await prisma.adminRole.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } })
    const passwordHash = await hashPassword(env.ADMIN_BOOTSTRAP_PASSWORD)
    await prisma.adminUser.create({
      data: {
        email: env.ADMIN_BOOTSTRAP_EMAIL,
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        roleId: superAdminRole.id,
      },
    })
    console.log(`\nBootstrap Super Admin created — email: ${env.ADMIN_BOOTSTRAP_EMAIL}`)
    console.log("Change the password immediately after first login (MFA enrollment is strongly recommended too).")
  } else {
    console.log(`\n${existingAdminCount} admin user(s) already exist — skipped bootstrap account creation.`)
  }

  console.log(`Seeded ${PERMISSION_CODES.length} permissions across ${ROLE_DEFINITIONS.length} roles.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
