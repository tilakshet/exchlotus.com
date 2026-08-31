import type { Server as HttpServer } from "node:http"
import { Server as SocketIoServer } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { verifyAccessToken } from "../modules/auth/token.util"
import { appEvents } from "../lib/events"
import { redis } from "../lib/redis"
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
 *  - notification   — fed by two sources: this process's own appEvents bus
 *                     for player-backend-originated events, and the
 *                     "player:notifications" Redis channel for events that
 *                     originate in the separate admin/backend process (e.g.
 *                     a support ticket reply — see admin/backend's
 *                     lib/redis.ts publishPlayerNotification), which has no
 *                     direct handle on this Socket.IO instance.
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

  // Cross-instance room/broadcast state — without this, a socket connected
  // to one backend replica never receives an event emitted (io.to(...)
  // below) from a request handled by a different replica, since each
  // process would otherwise only know about its own local connections. Only
  // one backend container runs today (docker-compose.prod.yml has no
  // replicas:), so this was a latent gap rather than a live bug — but
  // CLAUDE.md calls for horizontal scaling, and this is what makes that
  // actually work for realtime events once there's more than one instance.
  // Separate pub/sub clients, same reasoning as the player:notifications
  // subscriber below: a client that's issued SUBSCRIBE can't run other
  // commands, so the adapter needs its own dedicated pair, not the shared
  // `redis` client.
  const pubClient = redis.duplicate()
  const subClient = redis.duplicate()
  pubClient.on("error", (err) => logger.warn({ err }, "Redis adapter pub client error"))
  subClient.on("error", (err) => logger.warn({ err }, "Redis adapter sub client error"))
  io.adapter(createAdapter(pubClient, subClient))

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

  // Single-session enforcement (see Player.sessionVersion in schema.prisma
  // and auth.service.ts's issueTokensForNewLogin) — a new login elsewhere
  // already invalidated this player's other access/refresh tokens server-
  // side; this is just the real-time push so an already-open tab/app on the
  // old device finds out immediately instead of only on its next request.
  // disconnectSockets closes the room's live connections right after the
  // event is written to each socket, forcing a real reconnect (with a fresh
  // token) rather than leaving a socket alive on a session the REST API
  // would now reject anyway.
  appEvents.on("session:revoked", ({ playerExternalId }) => {
    io.to(playerRoom(playerExternalId)).emit("session:revoked")
    io.in(playerRoom(playerExternalId)).disconnectSockets(true)
  })

  // Subscriber needs its own connection — ioredis puts a client that has
  // called .subscribe() into a mode where it can no longer run other
  // commands, so this can't reuse the shared `redis` client from lib/redis.ts.
  const subscriber = redis.duplicate()
  subscriber.on("error", (err) => logger.warn({ err }, "Redis subscriber error on player:notifications"))
  // Re-issue the SUBSCRIBE on every successful connection, not just once at
  // startup — a `connect` here fires on ioredis's automatic reconnects too
  // (e.g. Redis restarting after this process is already up), so a boot-time
  // race where Redis isn't reachable yet doesn't leave this permanently
  // unsubscribed for the rest of the process's life once Redis comes back.
  subscriber.on("connect", () => {
    subscriber.subscribe("player:notifications").catch((err) => logger.warn({ err }, "Failed to subscribe to player:notifications"))
  })
  subscriber.on("message", (_channel, raw) => {
    try {
      const { playerExternalId, message, link } = JSON.parse(raw) as { playerExternalId: string; message: string; link?: string }
      io.to(playerRoom(playerExternalId)).emit("notification", { message, link })
    } catch (err) {
      logger.warn({ err }, "Failed to parse player:notifications message")
    }
  })

  return io
}

function playerRoom(externalId: string) {
  return `player:${externalId}`
}
