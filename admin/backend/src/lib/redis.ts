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

/**
 * Pushes a real-time notification to one player's connected sockets.
 * Published on the same shared Redis instance as bumpCatalogVersion above —
 * backend/'s socket server (backend/src/socket/socket.server.ts) subscribes
 * to this channel and emits it over Socket.IO to that player's room. This
 * process has no direct handle on that Socket.IO instance (separate
 * process), so pub/sub is the bridge, not an in-process EventEmitter.
 * Fails open, same as bumpCatalogVersion: a missed real-time push just
 * means the player finds out next time they open the app, not a 500 here.
 */
export async function publishPlayerNotification(
  playerExternalId: string,
  payload: { message: string; link?: string }
): Promise<void> {
  try {
    await redis.publish("player:notifications", JSON.stringify({ playerExternalId, ...payload }))
  } catch (err) {
    logger.warn({ err, playerExternalId }, "Redis publish failed — player will not get a real-time notification for this event")
  }
}
