import { createServer } from "node:http"
import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { createApp } from "./app"
import { createSocketServer } from "./socket/socket.server"
import { startMockProviderServer } from "./mocks/gaming-provider-mock.server"

if (env.GAMING_PROVIDER_BASE_URL.includes("127.0.0.1") || env.GAMING_PROVIDER_BASE_URL.includes("localhost")) {
  startMockProviderServer()
}

const app = createApp()
const httpServer = createServer(app)
createSocketServer(httpServer)

httpServer.listen(env.PORT, () => {
  logger.info(`exchlotus backend (HTTP + Socket.IO) listening on http://127.0.0.1:${env.PORT}`)
})
