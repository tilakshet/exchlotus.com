import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { verifyAccessToken } from "./token.util"
import { prisma } from "../../lib/prisma"
import type { AccessTokenPayload } from "./auth.types"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "UNAUTHENTICATED" })
  }

  let auth: AccessTokenPayload
  try {
    auth = verifyAccessToken(header.slice("Bearer ".length))
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "TOKEN_EXPIRED" })
    }
    return res.status(401).json({ error: "INVALID_TOKEN" })
  }

  // A still-valid access token doesn't mean a still-valid account — an
  // admin suspending a player must take effect immediately, not just on
  // that player's next login, so every authenticated request re-checks
  // current status rather than trusting whatever the token carried at
  // issuance (see backend Player.status doc comment in schema.prisma).
  const player = await prisma.player.findUnique({ where: { id: auth.sub }, select: { status: true } })
  if (!player || player.status === "SUSPENDED") {
    return res.status(403).json({ error: "ACCOUNT_SUSPENDED" })
  }

  req.auth = auth
  next()
}
