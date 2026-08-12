import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { verifyAccessToken } from "./token.util"
import { loadAuthContext } from "./admin-auth.service"
import type { AdminAuthContext } from "./admin-auth.types"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminAuth?: AdminAuthContext
    }
  }
}

/**
 * Unlike backend/'s player requireAuth (JWT-only, no DB hit), this re-checks
 * the AdminSession row on every request — the point of an admin panel's
 * "force logout" / session-revocation feature (master spec §11/§35) is that
 * it takes effect immediately, not after the access token happens to
 * expire. Also re-resolves the role's permission set fresh each time, so a
 * Super Admin editing a role's permissions applies to already-logged-in
 * sessions of that role without anyone needing to log out.
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "UNAUTHENTICATED" })
  }

  let payload
  try {
    payload = verifyAccessToken(header.slice("Bearer ".length))
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "TOKEN_EXPIRED" })
    }
    return res.status(401).json({ error: "INVALID_TOKEN" })
  }

  const context = await loadAuthContext(payload.sub, payload.sessionId)
  if (!context) {
    return res.status(401).json({ error: "INVALID_TOKEN" })
  }

  req.adminAuth = context
  next()
}
