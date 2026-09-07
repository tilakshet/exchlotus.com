import { randomBytes, randomInt, randomUUID } from "node:crypto"
import { env } from "../../lib/env"
import { prisma } from "../../lib/prisma"
import { appEvents } from "../../lib/events"
import { hashPassword, verifyPassword } from "./password.util"
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "./token.util"
import { AuthError } from "./auth.errors"
import { recordLoginEvent, type LoginEventContext } from "./login-event.service"
import { attributeReferral } from "../referral/referral.service"
import { logger } from "../../lib/logger"
import { sendOtpSms, SmsError } from "../notifications/sms/sms.service"
import type { AuthTokens } from "./auth.types"

const OTP_TTL_MINUTES = 5
const OTP_RESEND_COOLDOWN_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5
const RESET_TOKEN_TTL_MINUTES = 15
// How long a phone stays "verified" for signup after its OTP is confirmed —
// register() looks for a consumed OtpCode row for the phone inside this
// window instead of keeping a separate flag (checkOtpCode already stamps
// consumedAt). Long enough to finish filling the form, short enough that a
// stale verification can't be reused much later.
const SIGNUP_OTP_VERIFY_WINDOW_MINUTES = 20

async function issueTokens(player: { id: string; externalId: string; username: string; sessionVersion: number }): Promise<AuthTokens> {
  const { token: accessToken, expiresIn } = signAccessToken({
    sub: player.id,
    externalId: player.externalId,
    username: player.username,
    sv: player.sessionVersion,
  })
  const refresh = generateRefreshToken()
  await prisma.refreshToken.create({
    data: { playerId: player.id, tokenHash: refresh.hash, expiresAt: refresh.expiresAt },
  })
  return { accessToken, refreshToken: refresh.token, expiresIn }
}

/**
 * A genuinely new login (password, or OTP into an already-existing account)
 * — as opposed to a token refresh continuing the same session, or the very
 * first login right after registration where there's nothing else yet to
 * revoke. Bumps Player.sessionVersion (embedded in every access token's
 * `sv` claim) and revokes every other still-valid refresh token for this
 * player, so any other device currently signed in is force-logged-out: its
 * now-stale access token gets rejected by requireAuth on its very next
 * request, and its refresh token is revoked so it can't silently renew
 * instead. appEvents lets socket.server.ts push an immediate real-time kick
 * on top of that, to any of that device's still-open socket connections.
 */
async function issueTokensForNewLogin(player: { id: string; externalId: string; username: string }): Promise<AuthTokens> {
  const [updated] = await prisma.$transaction([
    prisma.player.update({ where: { id: player.id }, data: { sessionVersion: { increment: 1 } } }),
    prisma.refreshToken.updateMany({ where: { playerId: player.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
  appEvents.emit("session:revoked", { playerExternalId: updated.externalId })
  return issueTokens(updated)
}

export async function register(
  input: {
    username: string
    phone: string
    email?: string
    password: string
    gender: "MALE" | "FEMALE" | "OTHER"
    /** Another player's referralCode, if this signup came from a referral link/entry — see referral.service.ts attributeReferral. */
    referralCode?: string
  },
  context?: LoginEventContext
): Promise<AuthTokens> {
  // Phone first — it's the identifier login()/requestOtp() key off, so an
  // account created here has to collect it too or it would be permanently
  // unable to sign back in via "Login with Password".
  const existingPhone = await prisma.player.findUnique({ where: { phone: input.phone } })
  if (existingPhone) {
    await recordLoginEvent({ phone: input.phone, method: "REGISTER", result: "FAILURE", reason: "PHONE_TAKEN", context })
    throw new AuthError("PHONE_TAKEN", `Phone ${input.phone} is already registered`)
  }
  if (input.email) {
    const existingEmail = await prisma.player.findUnique({ where: { email: input.email } })
    if (existingEmail) {
      await recordLoginEvent({ phone: input.phone, method: "REGISTER", result: "FAILURE", reason: "EMAIL_TAKEN", context })
      throw new AuthError("EMAIL_TAKEN", `Email ${input.email} is already registered`)
    }
  }

  // Phone ownership must be proven by OTP before an account is created —
  // the client calls sendSignupOtp + verifySignupOtp first, which leaves a
  // consumed OtpCode row for this number. Without one (or an expired one),
  // registration is refused so phoneVerifiedAt below stays a real claim
  // (submitKyc's withdrawal gate and every "verified" UI depend on it).
  const verifiedOtp = await prisma.otpCode.findFirst({
    where: {
      phone: input.phone,
      consumedAt: { gte: new Date(Date.now() - SIGNUP_OTP_VERIFY_WINDOW_MINUTES * 60_000) },
    },
  })
  if (!verifiedOtp) {
    await recordLoginEvent({ phone: input.phone, method: "REGISTER", result: "FAILURE", reason: "PHONE_NOT_VERIFIED", context })
    throw new AuthError("PHONE_NOT_VERIFIED", "Please verify your mobile number to register")
  }

  const passwordHash = await hashPassword(input.password)
  const player = await prisma.player.create({
    data: {
      // The provider-facing identifier (webhook `user_id`) — decoupled from
      // our own internal Player.id, generated fresh at signup.
      externalId: randomUUID(),
      username: input.username,
      phone: input.phone,
      email: input.email,
      passwordHash,
      gender: input.gender,
      // KYC's own mobile-OTP confirmation step was removed (see
      // kyc.service.ts) — phone ownership is now treated as established at
      // the point a player supplies and validates it during signup instead
      // of through a separate OTP proof, so submitKyc's phoneVerifiedAt gate
      // stays meaningful without OTP.
      phoneVerifiedAt: new Date(),
      // Denormalized snapshot only — see schema.prisma doc comment. The
      // Referral row attributeReferral() creates below is the real,
      // validated relationship the reward engine acts on.
      referredByCode: input.referralCode?.trim() || null,
      wallet: { create: { balance: 0, currency: "INR" } },
    },
  })

  await recordLoginEvent({ playerId: player.id, phone: input.phone, method: "REGISTER", result: "SUCCESS", context })

  // Best-effort, deliberately: a referral-attribution bug must never block
  // account creation. attributeReferral() itself never throws for an
  // invalid/unknown code — this catch is only a backstop for a genuine
  // unexpected failure (e.g. a transient DB error).
  attributeReferral(player.id, input.referralCode, { ip: context?.ip, userAgent: context?.userAgent }).catch((err) => {
    logger.error({ err, playerId: player.id }, "Referral attribution failed")
  })

  return issueTokens(player)
}

/**
 * Phone-based, not email — the UI's "Login with Password" tab collects a
 * phone number now, matching Sign Up (also phone-first). Accounts created
 * purely through OTP verification have no passwordHash, so they can't use
 * this until a password is set somewhere for them — register() above is
 * one such place now (Sign Up with Password); the seeded fixture player is
 * the other (a phone was added to it by hand for exactly this purpose).
 */
export async function login(
  input: { phone: string; password: string },
  context?: LoginEventContext
): Promise<AuthTokens> {
  const player = await prisma.player.findUnique({ where: { phone: input.phone } })
  if (!player?.passwordHash) {
    await recordLoginEvent({ phone: input.phone, method: "PASSWORD", result: "FAILURE", reason: "INVALID_CREDENTIALS", context })
    throw new AuthError("INVALID_CREDENTIALS", "No account with that phone number/password")
  }

  const valid = await verifyPassword(input.password, player.passwordHash)
  if (!valid) {
    await recordLoginEvent({ playerId: player.id, phone: input.phone, method: "PASSWORD", result: "FAILURE", reason: "INVALID_CREDENTIALS", context })
    throw new AuthError("INVALID_CREDENTIALS", "No account with that phone number/password")
  }

  if (player.status === "SUSPENDED") {
    await recordLoginEvent({ playerId: player.id, phone: input.phone, method: "PASSWORD", result: "FAILURE", reason: "ACCOUNT_SUSPENDED", context })
    throw new AuthError("ACCOUNT_SUSPENDED", "This account has been suspended")
  }

  await recordLoginEvent({ playerId: player.id, phone: input.phone, method: "PASSWORD", result: "SUCCESS", context })
  return issueTokensForNewLogin(player)
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const hash = hashRefreshToken(refreshToken)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { player: true } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AuthError("INVALID_REFRESH_TOKEN", "Refresh token is invalid, expired, or already used")
  }

  if (stored.player.status === "SUSPENDED") {
    // Revoke so this refresh token can't be retried once the account is
    // reactivated — reactivation should require a fresh login, not silently
    // resurrect whatever session was active at suspension time.
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
    throw new AuthError("ACCOUNT_SUSPENDED", "This account has been suspended")
  }

  // Rotate: the presented token is single-use. Revoking it here means a
  // stolen-and-replayed refresh token stops working the moment the
  // legitimate client uses it once more.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })

  return issueTokens(stored.player)
}

export async function changePassword(playerId: string, currentPassword: string, newPassword: string): Promise<void> {
  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player?.passwordHash) {
    throw new AuthError("NO_PASSWORD_SET", "This account has no password set — it was created via OTP login")
  }

  const valid = await verifyPassword(currentPassword, player.passwordHash)
  if (!valid) {
    throw new AuthError("INVALID_CREDENTIALS", "Current password is incorrect")
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.player.update({ where: { id: playerId }, data: { passwordHash } })
}

function hashResetToken(token: string): string {
  // Same sha256-of-opaque-token principle as hashRefreshToken — only the
  // hash is ever persisted, so a DB leak alone can't be replayed as a live
  // reset link.
  return hashRefreshToken(token)
}

/**
 * Final step of Forgot Password: set the new password, authorized by the
 * single-use, time-limited resetToken that verifyPasswordResetOtp handed
 * back after the phone OTP was confirmed (that OTP check is what gates this
 * flow now — there is no separate CAPTCHA here). Also revokes every refresh
 * token and bumps sessionVersion — same reasoning as issueTokensForNewLogin:
 * a password reset should force every other signed-in device to
 * re-authenticate, not leave a possibly-compromised session alive.
 */
export async function resetPassword(input: { resetToken: string; newPassword: string }): Promise<void> {
  const tokenHash = hashResetToken(input.resetToken)
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
  if (!stored || stored.usedAt || stored.expiresAt < new Date() || !stored.playerId) {
    // "Reset link" was misleading copy carried over from an email-link
    // mental model — this flow never sends a link anywhere, the token is
    // just carried in-session from the identify step to this one. Plain
    // language about what to do next, not what technically went wrong.
    throw new AuthError("RESET_TOKEN_INVALID", "We couldn't verify this password reset. It may have expired or already been used — please start over.")
  }

  const passwordHash = await hashPassword(input.newPassword)
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.player.update({
      where: { id: stored.playerId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { playerId: stored.playerId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
}

export async function logout(refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * Generates a 6-digit code, sends it by SMS (see notifications/sms), then
 * persists the hash. The send happens BEFORE the OtpCode row is written on
 * purpose: if the gateway fails, no row exists, so the 60s resend cooldown
 * isn't tripped by a code that never arrived and the caller can retry
 * immediately.
 *
 * When SMS_ENABLED is false (local/dev) nothing is sent and the code comes
 * back as `devCode` so the flow stays testable offline; in production the
 * response body carries nothing.
 */
export async function requestOtp(phone: string): Promise<{ devCode?: string }> {
  const recent = await prisma.otpCode.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) } },
    orderBy: { createdAt: "desc" },
  })
  if (recent) {
    throw new AuthError("OTP_RATE_LIMITED", "Please wait a moment before requesting another code")
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0")

  try {
    await sendOtpSms(phone, code)
  } catch (err) {
    if (err instanceof SmsError) {
      logger.error({ err, phone, smsCode: err.code }, "OTP SMS send failed")
      throw new AuthError("OTP_SEND_FAILED", "We couldn't send the verification code right now. Please try again in a moment.")
    }
    throw err
  }

  const codeHash = await hashPassword(code)
  await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000) },
  })

  return env.SMS_ENABLED ? {} : { devCode: code }
}

/**
 * Sign Up step: send a phone-verification OTP. Fails fast if the number is
 * already registered (better UX than letting the eventual register() call
 * reject after the user has filled the whole form — signup enumeration on a
 * betting platform is low-risk and the number is one the caller controls).
 */
export async function sendSignupOtp(phone: string): Promise<{ devCode?: string }> {
  const existing = await prisma.player.findUnique({ where: { phone } })
  if (existing) {
    throw new AuthError("PHONE_TAKEN", `Phone ${phone} is already registered`)
  }
  return requestOtp(phone)
}

/**
 * Sign Up step: confirm the OTP. On success checkOtpCode stamps the row's
 * consumedAt, which register() then looks for (SIGNUP_OTP_VERIFY_WINDOW_MINUTES)
 * — no separate verified flag/store is kept.
 */
export async function verifySignupOtp(phone: string, code: string): Promise<void> {
  await checkOtpCode(phone, code)
}

/**
 * Forgot Password step 1: send an OTP to the account's phone. Enumeration-
 * safe — for a number with no account it returns the same shape and simply
 * sends nothing, so verifyPasswordResetOtp below will just report an
 * invalid code (there is none to match).
 */
export async function sendPasswordResetOtp(phone: string): Promise<{ devCode?: string }> {
  const player = await prisma.player.findUnique({ where: { phone } })
  if (!player) return {}
  return requestOtp(phone)
}

/**
 * Forgot Password step 2: confirm the OTP and hand back a single-use
 * resetToken (same credential requestPasswordReset used to mint) that
 * authorizes resetPassword().
 */
export async function verifyPasswordResetOtp(phone: string, code: string): Promise<{ resetToken: string }> {
  await checkOtpCode(phone, code)

  const player = await prisma.player.findUnique({ where: { phone } })
  if (!player) {
    // Unreachable in practice (sendPasswordResetOtp never sends for an
    // unknown number, so checkOtpCode above would already have thrown) —
    // kept as a defensive guard.
    throw new AuthError("OTP_INVALID", "No valid code found for that number — request a new one")
  }

  const resetToken = randomBytes(32).toString("base64url")
  await prisma.passwordResetToken.create({
    data: {
      playerId: player.id,
      tokenHash: hashResetToken(resetToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  })

  return { resetToken }
}

/**
 * The actual "is this the right code" check, with no knowledge of what it's
 * being used for — verifyOtp (login/signup) below is one caller; the KYC
 * module's confirm-phone step (kyc.service.ts) is the other, for accounts
 * that signed up with a password and so never proved phone ownership via
 * OTP at all. Throws AuthError("OTP_INVALID", ...) on any failure, marks
 * the code consumed on success.
 */
export async function checkOtpCode(phone: string, code: string): Promise<void> {
  const record = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  })

  if (!record || record.expiresAt < new Date()) {
    throw new AuthError("OTP_INVALID", "No valid code found for that number — request a new one")
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AuthError("OTP_INVALID", "Too many incorrect attempts — request a new code")
  }

  const valid = await verifyPassword(code, record.codeHash)
  if (!valid) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
    throw new AuthError("OTP_INVALID", "Incorrect code")
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
}

export async function verifyOtp(
  phone: string,
  code: string,
  referralCode?: string,
  gender?: "MALE" | "FEMALE" | "OTHER",
  context?: LoginEventContext
): Promise<AuthTokens> {
  try {
    await checkOtpCode(phone, code)
  } catch (err) {
    await recordLoginEvent({ phone, method: "OTP", result: "FAILURE", reason: "OTP_INVALID", context })
    throw err
  }

  // findOrCreate by phone: OTP is a first-class login method here, not just
  // a second factor on top of an email account, so verifying a new number
  // provisions an account the same way email+password registration does.
  const existingPlayer = await prisma.player.findUnique({ where: { phone } })
  const player =
    existingPlayer ??
    (await prisma.player.create({
      data: {
        externalId: randomUUID(),
        username: `player_${phone.slice(-4)}`,
        phone,
        referredByCode: referralCode || null,
        gender: gender ?? "OTHER",
        wallet: { create: { balance: 0, currency: "INR" } },
      },
    }))

  if (player.status === "SUSPENDED") {
    await recordLoginEvent({ playerId: player.id, phone, method: "OTP", result: "FAILURE", reason: "ACCOUNT_SUSPENDED", context })
    throw new AuthError("ACCOUNT_SUSPENDED", "This account has been suspended")
  }

  // A successful OTP is proof of phone ownership regardless of why it was
  // requested — set once, on whichever flow first establishes it.
  if (!player.phoneVerifiedAt) {
    await prisma.player.update({ where: { id: player.id }, data: { phoneVerifiedAt: new Date() } })
  }

  await recordLoginEvent({ playerId: player.id, phone, method: "OTP", result: "SUCCESS", context })
  // A brand-new signup has no other session to revoke; only an OTP login
  // into an already-existing account counts as a new login for
  // single-session enforcement (same distinction register() draws above).
  return existingPlayer ? issueTokensForNewLogin(player) : issueTokens(player)
}
