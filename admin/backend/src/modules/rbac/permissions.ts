/**
 * The full set of valid permission codes — single source of truth for both
 * the seed script (prisma/seed.ts, which creates one AdminPermission row per
 * entry) and requirePermission() (rbac.middleware.ts, which only accepts a
 * code from this list, so a typo in a route file fails at compile time
 * instead of silently gating nothing).
 */
export const PERMISSION_CODES = [
  "dashboard.view",
  "users.view",
  "users.suspend",
  "wallets.view",
  "wallets.adjust",
  "ledger.view",
  "withdrawals.view",
  "withdrawals.approve",
  "admins.view",
  "admins.manage",
  "roles.view",
  "roles.manage",
  "audit.view",
] as const

export type PermissionCode = (typeof PERMISSION_CODES)[number]
