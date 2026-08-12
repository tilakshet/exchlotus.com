import { randomUUID } from "node:crypto"
import type { NextFunction, Request, Response } from "express"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string
    }
  }
}

/**
 * Every admin-api request gets a request ID, independent of pino-http's own
 * internal one — AdminAuditLog.requestId (see lib/audit.ts) needs a stable
 * field to read off `req` without reaching into pino's request object.
 */
export function requestContext(req: Request, _res: Response, next: NextFunction) {
  req.requestId = randomUUID()
  next()
}
