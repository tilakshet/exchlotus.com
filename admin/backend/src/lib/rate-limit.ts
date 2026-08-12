import rateLimit from "express-rate-limit"
import { RedisStore } from "rate-limit-redis"
import { logger } from "./logger"
import { redis } from "./redis"

function redisStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: async (...args: string[]) => {
      const [command, ...rest] = args
      return redis.call(command, ...rest) as Promise<string | number | boolean | (string | number | boolean)[]>
    },
  })
}

// A Redis outage must degrade to "unlimited", not take the admin API down —
// same reasoning as backend/src/lib/rate-limit.ts.
const passOnStoreError = true

export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:admin-api:"),
  passOnStoreError,
  logger,
})

// Tighter than the player backend's authLimiter (10/15min) — admin login is
// a higher-value target (one compromised admin account reaches far more
// than one compromised player account) and admin traffic volume is orders
// of magnitude lower, so a stricter cap costs nothing in false positives.
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:admin-auth:"),
  passOnStoreError,
  logger,
})
