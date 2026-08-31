import { randomInt, randomUUID, createHash } from "node:crypto"
import { redis } from "../../lib/redis"
import { AuthError } from "./auth.errors"

const CAPTCHA_TTL_SECONDS = 5 * 60
const CAPTCHA_MAX_ATTEMPTS = 5
const CAPTCHA_DIGITS = 4

function captchaKey(captchaId: string): string {
  return `captcha:${captchaId}`
}

// sha256, not bcrypt: this is a short-lived, rate-limited, Redis-only
// secret (unlike a password or OTP hash, nothing durable leaks if a Redis
// snapshot is ever exposed), so there's no reason to pay bcrypt's cost on
// every login/register/reset request just to check a 4-digit code.
function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}

/**
 * A displayed-not-delivered numeric CAPTCHA (see login.tsx's "CAPTCHA: 4827"
 * mock) — the code itself is meant to be shown on screen, not kept secret
 * from the browser, so returning it directly in the response (unlike an
 * OTP) is correct here, not a leak. Only the server-side record (hash +
 * attempts) makes it possible to actually enforce that whatever the user
 * types back matches what was shown.
 */
export async function generateCaptcha(): Promise<{ captchaId: string; code: string }> {
  const code = randomInt(0, 10 ** CAPTCHA_DIGITS).toString().padStart(CAPTCHA_DIGITS, "0")
  const captchaId = randomUUID()
  try {
    await redis.set(captchaKey(captchaId), JSON.stringify({ codeHash: hashCode(code), attempts: 0 }), "EX", CAPTCHA_TTL_SECONDS)
  } catch {
    // Unlike getOrSetCache (lib/redis.ts), there's no non-Redis fallback for
    // "remember a challenge across two requests" — degrade to a clean,
    // typed 503 instead of letting the raw Redis error reach app.ts's
    // catch-all and come back as an opaque INTERNAL_ERROR.
    throw new AuthError("CAPTCHA_UNAVAILABLE", "CAPTCHA is temporarily unavailable — please try again in a moment")
  }
  return { captchaId, code }
}

/**
 * Throws AuthError("CAPTCHA_INVALID", ...) on any failure (missing/expired,
 * too many attempts, wrong code) — callers don't need to distinguish why.
 * Single-use: a correct answer deletes the record immediately, so the same
 * captchaId/code pair can't be replayed across two requests.
 */
export async function verifyCaptcha(captchaId: string, code: string): Promise<void> {
  const key = captchaKey(captchaId)

  let raw: string | null
  try {
    raw = await redis.get(key)
  } catch {
    throw new AuthError("CAPTCHA_UNAVAILABLE", "CAPTCHA is temporarily unavailable — please try again in a moment")
  }

  if (!raw) {
    throw new AuthError("CAPTCHA_INVALID", "CAPTCHA has expired — please try again")
  }

  const record = JSON.parse(raw) as { codeHash: string; attempts: number }
  if (record.attempts >= CAPTCHA_MAX_ATTEMPTS) {
    await redis.del(key).catch(() => {})
    throw new AuthError("CAPTCHA_INVALID", "Too many incorrect attempts — please try again")
  }

  if (record.codeHash !== hashCode(code)) {
    // Best-effort attempt counter — a failed increment here just means one
    // extra guess slips through on a flaky Redis, not a hole in
    // authLimiter's own request-level cap on the endpoint calling this.
    try {
      const ttl = await redis.ttl(key)
      await redis.set(key, JSON.stringify({ ...record, attempts: record.attempts + 1 }), "EX", ttl > 0 ? ttl : CAPTCHA_TTL_SECONDS)
    } catch {
      // ignore — see above
    }
    throw new AuthError("CAPTCHA_INVALID", "Incorrect CAPTCHA")
  }

  await redis.del(key).catch(() => {})
}
