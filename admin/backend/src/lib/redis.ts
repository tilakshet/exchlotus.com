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
