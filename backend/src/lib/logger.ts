import pino from "pino"
import { env } from "./env"

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  // pino-http records request headers; never persist player/provider bearer
  // tokens in development or production logs.
  redact: { paths: ["req.headers.authorization"], censor: "[REDACTED]" },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
      : undefined,
})
