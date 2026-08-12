import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Comma-separated allowed origins. Unset = allow all (local dev only). */
  CORS_ORIGIN: z.string().optional(),

  // This provider authenticates with a single static API key sent as a
  // Bearer token — no separate token-exchange step (unlike the original
  // "Gaming API Specification v2.4" this integration started against,
  // which used OAuth2 agent_token:agent_secret → access_token). See
  // backend README "Provider integration — v2 endpoint set".
  GAMING_PROVIDER_BASE_URL: z.string().url(),
  GAMING_PROVIDER_API_KEY: z.string().min(1),
  MOCK_PROVIDER_PORT: z.coerce.number().int().positive().default(4100),

  GAMING_WEBHOOK_SHARED_SECRET: z.string().min(1),

  /** Gates POST /api/catalog/sync — an operator/cron action, not something any logged-in player should be able to trigger. */
  CATALOG_SYNC_SECRET: z.string().min(16),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors)
  throw new Error("Invalid environment configuration — see above for missing/invalid variables.")
}

export const env = parsed.data
