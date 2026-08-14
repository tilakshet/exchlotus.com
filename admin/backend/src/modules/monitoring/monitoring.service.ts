import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis"

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; latencyMs: number; ok: boolean }> {
  const start = performance.now()
  try {
    const result = await fn()
    return { result, latencyMs: performance.now() - start, ok: true }
  } catch {
    return { result: null, latencyMs: performance.now() - start, ok: false }
  }
}

/**
 * In-process, safely-observable metrics only — a real DB round trip, a real
 * Redis ping, real process stats. No CPU/disk/container-level metrics: those
 * need infra outside a single Express process and aren't available here.
 * Redis degrades to `ok: false` instead of throwing, matching redis.ts's
 * existing "fail open" philosophy (see its own doc-comment).
 */
export async function getSystemStatus() {
  const [db, redisCheck, activeSessions] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    timed(() => redis.ping()),
    prisma.adminSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
  ])

  return {
    database: { status: db.ok ? "ok" : "unreachable", latencyMs: db.ok ? Math.round(db.latencyMs) : null },
    redis: { status: redisCheck.ok ? "ok" : "unreachable", latencyMs: redisCheck.ok ? Math.round(redisCheck.latencyMs) : null },
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage(),
    },
    activeAdminSessions: activeSessions,
    checkedAt: new Date().toISOString(),
  }
}
