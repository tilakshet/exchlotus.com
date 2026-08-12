import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { verifyAccessToken } from "./token.util"
import type { AccessTokenPayload } from "./auth.types"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "UNAUTHENTICATED" })
  }

  try {
    req.auth = verifyAccessToken(header.slice("Bearer ".length))
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "TOKEN_EXPIRED" })
    }
    return res.status(401).json({ error: "INVALID_TOKEN" })
  }
}
