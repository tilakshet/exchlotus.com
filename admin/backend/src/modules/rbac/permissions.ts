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
  "withdrawals.export",
  "kyc.export",
  "payments.view",
  "payments.export",
  "bank-accounts.view",
  "bank-accounts.export",
  "game-launches.view",
  "game-launches.export",
  "admins.view",
  "admins.manage",
  "roles.view",
  "roles.manage",
  "audit.view",
  "games.view",
  "games.manage",
  "reports.view",
  "notifications.view",
  "monitoring.view",
  "users.export",
  "ledger.export",
  "games.export",
  "reports.export",
  "support.view",
  "support.manage",
  "kyc.view",
  "kyc.manage",
  "referrals.view",
  "referrals.manage",
  "referrals.export",
  "referral-settings.manage",
  "referral-campaigns.manage",
] as const

export type PermissionCode = (typeof PERMISSION_CODES)[number]
