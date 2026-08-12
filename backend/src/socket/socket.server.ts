import type { Server as HttpServer } from "node:http"
import { Server as SocketIoServer } from "socket.io"
import { verifyAccessToken } from "../modules/auth/token.util"
import { appEvents } from "../lib/events"
import { env } from "../lib/env"
import { logger } from "../lib/logger"

/**
 * Real-time channel. Four event names are defined per the frontend spec
 * (wallet:update, notification, bet:update, provider:update), but only two
 * have a real trigger wired up today:
 *
 *  - wallet:update  — fires whenever wallet.service.applyLedgerEntry
 *                     actually changes a balance (bet/win/refund/deposit/
 *                     withdrawal), via the appEvents bus.
 *  - notification   — generic channel, used today only for the deposit/
 *                     withdrawal confirmation (see wallet.controller.ts).
 *
 * bet:update and provider:update are scaffolded (typed, room-based) but
 * have no real source of live betting/provider-status data behind them yet
 * — see README "Not yet done". Rather than emit synthetic data on them,
 * they simply aren't emitted until a real feature produces real events.
 */
export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketIoServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true, credentials: true },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error("UNAUTHENTICATED"))
    try {
      socket.data.auth = verifyAccessToken(token)
      next()
    } catch {
      next(new Error("INVALID_TOKEN"))
    }
  })

  io.on("connection", (socket) => {
    const { externalId } = socket.data.auth
    socket.join(playerRoom(externalId))
    logger.debug({ externalId }, "Socket connected")

    socket.on("disconnect", () => {
      logger.debug({ externalId }, "Socket disconnected")
    })
  })

  appEvents.on("wallet:changed", ({ playerExternalId, balance }) => {
    io.to(playerRoom(playerExternalId)).emit("wallet:update", { balance })
  })

  return io
}

function playerRoom(externalId: string) {
  return `player:${externalId}`
}
