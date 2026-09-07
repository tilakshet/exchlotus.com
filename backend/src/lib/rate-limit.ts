import rateLimit from "express-rate-limit"
import { RedisStore } from "rate-limit-redis"
import { logger } from "./logger"
import { redis } from "./redis"

// Bounds how long a single rate-limit check can block a real request when
// Redis is unreachable. Measured directly: with Redis down, requests through
// apiLimiter were taking 4-6 SECONDS each — ioredis's own reconnect/retry
// timing (retryStrategy backoff, maxRetriesPerRequest requeuing) stacks up
// to far more than the `redis` client's own commandTimeout (2000ms) would
// suggest, since a fresh command arriving mid-backoff waits out however much
// of that cycle is left, not a fresh 2s each time. passOnStoreError below
// already degrades correctly to "unlimited" on a store error — this makes
// that degradation actually fast, matching CLAUDE.md's <100ms/<300ms
// targets instead of taking multiple seconds to arrive at the same outcome.
const SEND_COMMAND_TIMEOUT_MS = 300

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis command exceeded ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

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
      const result = redis.call(command, ...rest) as Promise<string | number | boolean | (string | number | boolean)[]>
      return withTimeout(result, SEND_COMMAND_TIMEOUT_MS)
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

/**
 * Guards the OTP-send endpoints (register / forgot-password phone
 * verification). Every call costs a real SMS, so this is the credit-drain
 * / abuse ceiling — sized above a genuine user's retries (mistyped number,
 * a couple of resends) but well under automated hammering. auth.service.ts
 * keeps a separate 60s per-phone cooldown as the second layer.
 */
export const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:otp-request:"),
  passOnStoreError,
  logger,
})
