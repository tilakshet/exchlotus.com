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

  /** Authenticates admin/backend's server-to-server calls into POST /api/referral/internal/evaluate (referral.controller.ts) — the same static-shared-secret pattern as GAMING_WEBHOOK_SHARED_SECRET, not a player-facing credential. Lets a KYC approval in the (separate-process) admin backend trigger referral qualification re-evaluation without duplicating the reward-issuance logic into that codebase too. */
  REFERRAL_INTERNAL_SECRET: z.string().min(16),

  /** Gates POST /api/catalog/sync — an operator/cron action, not something any logged-in player should be able to trigger. */
  CATALOG_SYNC_SECRET: z.string().min(16),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Real-money payment gateway (PayIn deposits, Payout withdrawals) — see
  // backend/src/modules/payments. Neither callback the gateway sends is
  // signature-verified (undocumented by the provider); payments.service.ts
  // binds strictly to a pending order/withdrawal WE created instead. Kept
  // configured (Oro is not being deleted) even while Cashfree is the active
  // PayIn gateway — see gateway/oro-gateway.client.ts / cashfree-gateway.client.ts.
  PAYMENT_GATEWAY_BASE_URL: z.string().url(),
  PAYMENT_GATEWAY_CLIENT_ID: z.string().min(1),
  PAYMENT_GATEWAY_SECRET_ID: z.string().min(1),
  /** Used to build the per-transaction redirect_url sent to the PayIn API — where the player's browser returns to after paying. */
  PAYMENT_CALLBACK_BASE_URL: z.string().url(),

  // Cashfree PG (deposits) — active PayIn gateway (see cashfree-gateway.client.ts).
  // Unlike Oro's, Cashfree's webhook IS signature-verified — Cashfree has no
  // separate webhook secret to configure; per their own reference
  // implementation (github.com/cashfree/cashfree-pg-webhook), x-webhook-signature
  // is HMAC-SHA256'd with this same Client Secret, not a distinct one.
  CASHFREE_BASE_URL: z.string().url().default("https://sandbox.cashfree.com"),
  CASHFREE_CLIENT_ID: z.string().min(1),
  CASHFREE_CLIENT_SECRET: z.string().min(1),
  CASHFREE_API_VERSION: z.string().default("2023-08-01"),

  /** This backend's own public origin — used to build absolute URLs (e.g. support ticket image attachments) that admin/frontend, a different domain, can load directly. Unlike PAYMENT_CALLBACK_BASE_URL (the frontend's origin), this is the API's own. */
  PUBLIC_BASE_URL: z.string().url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors)
  throw new Error("Invalid environment configuration — see above for missing/invalid variables.")
}

export const env = parsed.data
