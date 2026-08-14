import Redis from "ioredis"
import { env } from "./env"
import { logger } from "./logger"

// Same namespace, separate keyspace by prefix (see rate-limit.ts) — this is
// intentionally the same physical Redis instance as backend/, not a second
// one, per CLAUDE.md's shared-infra guidance. Only rate-limit storage today;
// no cache-aside reads yet (dashboard metrics are cheap enough to compute
// live at this data volume — revisit once real traffic exists).
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  commandTimeout: 2000,
})

redis.on("error", (err) => {
  logger.warn({ err }, "Redis error — rate limiting will fail open")
})

/**
 * Same "catalog:version" key backend/'s syncCatalog() bumps — same physical
 * Redis instance, so incrementing it here invalidates the player-facing
 * catalog cache immediately when an admin enables/disables a game, without
 * either app importing the other's code. Degrades the same way backend's
 * own bumpCatalogVersion does: a failed bump just means the player-facing
 * cache is briefly stale until its TTL expires, not a hard error.
 */
export async function bumpCatalogVersion(): Promise<void> {
  try {
    await redis.incr("catalog:version")
  } catch (err) {
    logger.warn({ err }, "Redis write failed for catalog:version bump — cached catalog data may be briefly stale")
  }
}
