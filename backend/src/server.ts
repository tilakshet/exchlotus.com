import { createServer } from "node:http"
import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { createApp } from "./app"
import { createSocketServer } from "./socket/socket.server"
import { startMockProviderServer } from "./mocks/gaming-provider-mock.server"

// Every Redis-touching path in this app is deliberately built to degrade,
// not fail, when Redis is down (getOrSetCache falls back to Postgres,
// rate-limit.ts's passOnStoreError skips limiting, every ioredis client here
// has its own .on("error", ...) handler) — but that guarantee has a gap:
// a handful of Redis client libraries (confirmed via rate-limit-redis's own
// "async error during store initialization" path) reject a promise from
// somewhere Node can't attribute to any of those handlers, which is a fatal,
// process-killing unhandledRejection by default. Registered first, before
// anything below creates a Redis connection, so nothing at boot can race
// past it.
process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled promise rejection — logged, not crashing the process")
})

if (env.GAMING_PROVIDER_BASE_URL.includes("127.0.0.1") || env.GAMING_PROVIDER_BASE_URL.includes("localhost")) {
  startMockProviderServer()
}

const app = createApp()
const httpServer = createServer(app)
createSocketServer(httpServer)

httpServer.listen(env.PORT, () => {
  logger.info(`exchlotus backend (HTTP + Socket.IO) listening on http://127.0.0.1:${env.PORT}`)
})
