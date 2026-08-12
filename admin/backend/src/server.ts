import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { createApp } from "./app"

const app = createApp()

app.listen(env.PORT, () => {
  logger.info(`exchlotus admin backend listening on http://127.0.0.1:${env.PORT}`)
})
