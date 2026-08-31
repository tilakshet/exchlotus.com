import Redis from "ioredis"
import { env } from "./env"
import { logger } from "./logger"

export const redis = new Redis(env.REDIS_URL, {
  // Cache reads must never block a request on a down Redis — fall through
  // to Postgres instead (see getOrSetCache). A bounded retry avoids piling
  // up reconnect attempts under sustained outage.
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  // maxRetriesPerRequest only bounds retries after a command fails fast
  // (e.g. connection refused) — it does nothing if Redis accepts the TCP
  // connection but then never replies (wedged/overloaded, not down). Without
  // a hard per-command timeout, a request awaiting that command hangs
  // forever: rate-limit.ts's passOnStoreError only catches a *rejected*
  // command, and getOrSetCache's try/catch has the same blind spot.
  //
  // Was 2000ms — measured directly (a real Redis outage, apiLimiter's own
  // request path) that a single request routinely makes 2-3 sequential
  // Redis calls (a rate-limit check, then getCatalogVersion, then the
  // actual cache read), each independently paying up to this timeout before
  // falling through — stacking to 4-6+ seconds total for one request, wildly
  // outside CLAUDE.md's <100ms/<300ms targets. A healthy Redis round-trip is
  // single-digit milliseconds; 300ms is still generous headroom over that
  // while making every one of these fall-through paths fail fast instead of
  // stacking into multi-second requests when Redis is actually down.
  commandTimeout: 300,
})

redis.on("error", (err) => {
  logger.warn({ err }, "Redis error — falling back to direct DB reads")
})

/**
 * Cache-aside read: serve from Redis when present, otherwise call `fetcher`
 * (the real Postgres query) and populate the cache for `ttlSeconds`. Any
 * Redis failure (down, timeout) is swallowed and falls through to
 * `fetcher` — a cache outage must degrade to "slower" (direct DB reads,
 * see CLAUDE.md caching strategy), never to a 500.
 */
export async function getOrSetCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached !== null) return JSON.parse(cached) as T
  } catch (err) {
    logger.warn({ err, key }, "Redis read failed, falling back to source")
  }

  const value = await fetcher()

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds)
  } catch (err) {
    logger.warn({ err, key }, "Redis write failed — served fresh data uncached")
  }

  return value
}

/**
 * All catalog/home cache keys are namespaced with this version instead of
 * being deleted individually on sync — bumping it instantly orphans every
 * existing key (they just expire on their own TTL) without needing a
 * production-unsafe KEYS/SCAN sweep across arbitrary filter combinations
 * (see listGames' cache key, which varies per search/category/page).
 */
export async function getCatalogVersion(): Promise<number> {
  try {
    // 0, not 1: INCR on a missing key sets it to 1, so defaulting the
    // missing-key case to 1 here would make the very first bump a no-op
    // (both resolve to the same version, so no cache key actually changes).
    const version = await redis.get("catalog:version")
    return version ? Number(version) : 0
  } catch (err) {
    logger.warn({ err }, "Redis read failed for catalog:version, defaulting to 0")
    return 0
  }
}

export async function bumpCatalogVersion(): Promise<void> {
  try {
    await redis.incr("catalog:version")
  } catch (err) {
    logger.warn({ err }, "Redis write failed for catalog:version bump — cached catalog data may be briefly stale")
  }
}
