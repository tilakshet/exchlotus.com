import { prisma } from "../../lib/prisma"
import { logger } from "../../lib/logger"

export interface LoginEventContext {
  ip?: string
  userAgent?: string
}

/**
 * Best-effort — a write failure here must never block a real login/signup
 * attempt (this is security telemetry, not a financial record), so
 * failures are swallowed and logged rather than thrown.
 */
export async function recordLoginEvent(params: {
  playerId?: string | null
  phone: string
  method: "PASSWORD" | "OTP" | "REGISTER"
  result: "SUCCESS" | "FAILURE"
  reason?: string
  context?: LoginEventContext
}) {
  try {
    await prisma.loginEvent.create({
      data: {
        playerId: params.playerId ?? null,
        phone: params.phone,
        method: params.method,
        result: params.result,
        reason: params.reason,
        ipAddress: params.context?.ip,
        userAgent: params.context?.userAgent,
      },
    })
  } catch (err) {
    logger.warn({ err }, "Failed to record login event")
  }
}
