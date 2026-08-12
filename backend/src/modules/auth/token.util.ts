import { randomBytes, createHash } from "node:crypto"
import jwt from "jsonwebtoken"
import { env } from "../../lib/env"
import type { AccessTokenPayload } from "./auth.types"

export function signAccessToken(payload: AccessTokenPayload): { token: string; expiresIn: number } {
  const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] })
  const decoded = jwt.decode(token) as { exp: number; iat: number }
  return { token, expiresIn: decoded.exp - decoded.iat }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & jwt.JwtPayload
}

/**
 * Refresh tokens are opaque high-entropy random strings, not JWTs — we
 * store only a hash of them (same principle as a password), so a database
 * leak alone can't be replayed as a live session.
 */
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("base64url")
  const hash = hashRefreshToken(token)
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, hash, expiresAt }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
