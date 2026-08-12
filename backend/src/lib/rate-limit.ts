import rateLimit from "express-rate-limit"
import { RedisStore } from "rate-limit-redis"
import { logger } from "./logger"
import { redis } from "./redis"

/**
 * Redis-backed, not the default in-memory store — an in-memory limiter
 * only sees the requests that happen to land on one process, which both
 * undercounts abuse across multiple instances and forgets everything on
 * every deploy (see CLAUDE.md "stateless application servers").
 */
function redisStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: async (...args: string[]) => {
      const [command, ...rest] = args
      return redis.call(command, ...rest) as Promise<string | number | boolean | (string | number | boolean)[]>
    },
  })
}

/**
 * Shared with both limiters below: a Redis outage must degrade to
 * "unlimited" rather than 500 every request. apiLimiter sits in front of
 * the entire /api surface, so without this, a Redis blip takes the whole
 * API down — the same failure mode getOrSetCache already guards against
 * for cache reads (see redis.ts). pino's error()/warn() already match the
 * (error, message) shape express-rate-limit's Logger type expects.
 */
const passOnStoreError = true

/**
 * Broad safety net across the whole API, not a per-endpoint budget — a
 * single dashboard load alone fires dozens of catalog/category/home
 * requests (see features/wins/RecentBigWinsRow.tsx), so this has to cover
 * real multi-request page loads across a session, not just protect against
 * abuse. authLimiter below is the one actually sized to deter attacks.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:api:"),
  passOnStoreError,
  logger,
})

/**
 * Tighter limit on login/registration/OTP — these are the endpoints an
 * attacker actually gains something from hammering (password guessing,
 * OTP guessing/spamming, account enumeration via register).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:auth:"),
  passOnStoreError,
  logger,
})
