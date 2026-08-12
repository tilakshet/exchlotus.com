import { createHash, randomBytes } from "node:crypto"
import jwt from "jsonwebtoken"
import { env } from "../../lib/env"
import type { AdminAccessTokenPayload, MfaChallengeTokenPayload } from "./admin-auth.types"

export function signAccessToken(payload: AdminAccessTokenPayload): { token: string; expiresIn: number } {
  const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] })
  const decoded = jwt.decode(token) as { exp: number; iat: number }
  return { token, expiresIn: decoded.exp - decoded.iat }
}

export function verifyAccessToken(token: string): AdminAccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AdminAccessTokenPayload & jwt.JwtPayload
}

/**
 * Scoped strictly to "prove you already passed password auth, now prove the
 * second factor" — carries a `purpose` claim so it can never be mistaken
 * for (or replayed as) a real access token even if it leaked, and a short
 * TTL since it only needs to survive the time it takes to open an
 * authenticator app.
 */
export function signMfaChallengeToken(adminId: string): string {
  const payload: MfaChallengeTokenPayload = { sub: adminId, purpose: "mfa_challenge" }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "5m" })
}

export function verifyMfaChallengeToken(token: string): MfaChallengeTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as MfaChallengeTokenPayload & jwt.JwtPayload
  if (decoded.purpose !== "mfa_challenge") {
    throw new jwt.JsonWebTokenError("Not an MFA challenge token")
  }
  return decoded
}

/** Opaque, hashed at rest — same pattern as backend/'s Player.RefreshToken. */
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("base64url")
  const hash = hashRefreshToken(token)
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, hash, expiresAt }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
