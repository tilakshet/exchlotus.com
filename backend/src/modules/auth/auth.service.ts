import { randomInt, randomUUID } from "node:crypto"
import { env } from "../../lib/env"
import { prisma } from "../../lib/prisma"
import { hashPassword, verifyPassword } from "./password.util"
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "./token.util"
import { AuthError } from "./auth.errors"
import type { AuthTokens } from "./auth.types"

const OTP_TTL_MINUTES = 5
const OTP_RESEND_COOLDOWN_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5

async function issueTokens(player: { id: string; externalId: string; username: string }): Promise<AuthTokens> {
  const { token: accessToken, expiresIn } = signAccessToken({
    sub: player.id,
    externalId: player.externalId,
    username: player.username,
  })
  const refresh = generateRefreshToken()
  await prisma.refreshToken.create({
    data: { playerId: player.id, tokenHash: refresh.hash, expiresAt: refresh.expiresAt },
  })
  return { accessToken, refreshToken: refresh.token, expiresIn }
}

export async function register(input: {
  username: string
  phone: string
  email?: string
  password: string
}): Promise<AuthTokens> {
  // Phone first — it's the identifier login()/requestOtp() key off, so an
  // account created here has to collect it too or it would be permanently
  // unable to sign back in via "Login with Password".
  const existingPhone = await prisma.player.findUnique({ where: { phone: input.phone } })
  if (existingPhone) {
    throw new AuthError("PHONE_TAKEN", `Phone ${input.phone} is already registered`)
  }
  if (input.email) {
    const existingEmail = await prisma.player.findUnique({ where: { email: input.email } })
    if (existingEmail) {
      throw new AuthError("EMAIL_TAKEN", `Email ${input.email} is already registered`)
    }
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
      wallet: { create: { balance: 0, currency: "INR" } },
    },
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
export async function login(input: { phone: string; password: string }): Promise<AuthTokens> {
  const player = await prisma.player.findUnique({ where: { phone: input.phone } })
  if (!player?.passwordHash) {
    throw new AuthError("INVALID_CREDENTIALS", "No account with that phone number/password")
  }

  const valid = await verifyPassword(input.password, player.passwordHash)
  if (!valid) {
    throw new AuthError("INVALID_CREDENTIALS", "No account with that phone number/password")
  }

  return issueTokens(player)
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const hash = hashRefreshToken(refreshToken)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { player: true } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AuthError("INVALID_REFRESH_TOKEN", "Refresh token is invalid, expired, or already used")
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

export async function logout(refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * No SMS gateway is connected. In any non-production env the generated
 * code is returned to the caller instead of "sent" anywhere, so the flow
 * is genuinely exercisable end to end — a real gateway integration would
 * add a send-it-by-SMS call here and drop `devCode` from the return.
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
  const codeHash = await hashPassword(code)
  await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000) },
  })

  return env.NODE_ENV === "production" ? {} : { devCode: code }
}

export async function verifyOtp(phone: string, code: string, referralCode?: string): Promise<AuthTokens> {
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

  // findOrCreate by phone: OTP is a first-class login method here, not just
  // a second factor on top of an email account, so verifying a new number
  // provisions an account the same way email+password registration does.
  const player =
    (await prisma.player.findUnique({ where: { phone } })) ??
    (await prisma.player.create({
      data: {
        externalId: randomUUID(),
        username: `player_${phone.slice(-4)}`,
        phone,
        referredByCode: referralCode || null,
        wallet: { create: { balance: 0, currency: "INR" } },
      },
    }))

  return issueTokens(player)
}
