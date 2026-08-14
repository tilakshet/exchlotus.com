import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  PORT: z.coerce.number().int().positive().default(4600),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Comma-separated allowed origins. Unset = allow all (local dev only). */
  CORS_ORIGIN: z.string().optional(),

  /**
   * Deliberately its own secret, never shared with backend/'s
   * JWT_ACCESS_SECRET — a leaked player-facing secret must not also forge
   * admin sessions, and vice versa.
   */
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),

  MFA_ISSUER: z.string().default("Exchlotus Admin"),

  /** A manual wallet WITHDRAWAL adjustment at/above this amount surfaces in the notifications feed. */
  LARGE_WITHDRAWAL_THRESHOLD: z.coerce.number().positive().default(50000),

  /** Used only by prisma/seed.ts to provision the first SUPER_ADMIN. */
  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8),

  // Same PayIn/Payout aggregator as backend/ — only the payout side is
  // called from here (withdrawals.service.ts, on admin approval). Same
  // credentials as backend/.env.production's PAYMENT_GATEWAY_CLIENT_ID/
  // SECRET_ID, entered separately since these are two separate deployables.
  PAYMENT_GATEWAY_BASE_URL: z.string().url(),
  PAYMENT_GATEWAY_CLIENT_ID: z.string().min(1),
  PAYMENT_GATEWAY_SECRET_ID: z.string().min(1),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors)
  throw new Error("Invalid environment configuration — see above for missing/invalid variables.")
}

export const env = parsed.data
