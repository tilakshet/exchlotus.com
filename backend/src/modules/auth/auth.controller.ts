import { Router } from "express"
import { z } from "zod"
import { authLimiter, otpRequestLimiter } from "../../lib/rate-limit"
import { logger } from "../../lib/logger"
import { requireAuth } from "./auth.middleware"
import { AuthError } from "./auth.errors"
import {
  changePassword,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  sendPasswordResetOtp,
  sendSignupOtp,
  verifyPasswordResetOtp,
  verifySignupOtp,
} from "./auth.service"
import type { LoginEventContext } from "./login-event.service"

export const authRouter = Router()

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number, e.g. +919876543210")

const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"])

const registerSchema = z.object({
  username: z.string().min(2).max(40),
  phone: phoneSchema,
  email: z.string().email().optional(),
  password: z.string().min(8).max(72), // bcrypt truncates beyond 72 bytes
  gender: genderSchema,
  // Another player's referral code — validated server-side (existence,
  // referrer active, not self, not already attributed) in
  // referral.service.ts attributeReferral, never trusted as-is.
  referralCode: z.string().max(40).optional(),
})

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// Both OTP flows (signup phone verification + forgot password) — a bare
// phone number to send a 6-digit code to.
const otpRequestSchema = z.object({
  phone: phoneSchema,
})

const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
})

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8).max(72), // matches registerSchema
})

function loginContext(req: import("express").Request): LoginEventContext {
  return { ip: req.ip, userAgent: req.header("user-agent") }
}

function sendAuthError(res: import("express").Response, err: unknown) {
  if (err instanceof AuthError) {
    const status =
      err.code === "EMAIL_TAKEN" || err.code === "PHONE_TAKEN"
        ? 409
        : err.code === "OTP_RATE_LIMITED"
          ? 429
          : err.code === "NO_PASSWORD_SET" ||
              err.code === "RESET_TOKEN_INVALID" ||
              err.code === "OTP_INVALID" ||
              err.code === "PHONE_NOT_VERIFIED"
            ? 422
            : err.code === "ACCOUNT_SUSPENDED"
              ? 403
              : err.code === "OTP_SEND_FAILED"
                ? 503
                : 401
    return res.status(status).json({ error: err.code, message: err.message })
  }
  throw err
}

authRouter.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const tokens = await register(parsed.data, loginContext(req))
    res.status(201).json(tokens)
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const tokens = await login(parsed.data, loginContext(req))
    res.json(tokens)
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const tokens = await refresh(parsed.data.refreshToken)
    res.json(tokens)
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await logout(parsed.data.refreshToken)
    res.status(204).send()
  } catch (err) {
    logger.error({ err }, "Logout failed")
    res.status(500).json({ error: "INTERNAL_ERROR" })
  }
})

// --- Phone-verification OTP: Sign Up ---------------------------------------

// otpRequestLimiter (per-IP, 6/hour) on top of authLimiter — every call
// sends a real SMS. auth.service.ts adds a 60s per-phone cooldown.
authRouter.post("/register/send-otp", authLimiter, otpRequestLimiter, async (req, res) => {
  const parsed = otpRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    res.json(await sendSignupOtp(parsed.data.phone))
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/register/verify-otp", authLimiter, async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await verifySignupOtp(parsed.data.phone, parsed.data.code)
    res.json({ verified: true })
  } catch (err) {
    sendAuthError(res, err)
  }
})

// --- Phone-verification OTP: Forgot Password ------------------------------

authRouter.post("/forgot-password/send-otp", authLimiter, otpRequestLimiter, async (req, res) => {
  const parsed = otpRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    // Enumeration-safe: same shape whether or not the number has an account.
    res.json(await sendPasswordResetOtp(parsed.data.phone))
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/forgot-password/verify-otp", authLimiter, async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    res.json(await verifyPasswordResetOtp(parsed.data.phone, parsed.data.code))
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/reset-password", authLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await resetPassword(parsed.data)
    res.status(204).send()
  } catch (err) {
    sendAuthError(res, err)
  }
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72), // bcrypt truncates beyond 72 bytes — matches registerSchema
})

// requireAuth (not just authLimiter): this is a credential-change on an
// already-identified account, not a login attempt — the caller must
// already hold a valid access token.
authRouter.post("/change-password", requireAuth, authLimiter, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await changePassword(req.auth!.sub, parsed.data.currentPassword, parsed.data.newPassword)
    res.status(204).send()
  } catch (err) {
    sendAuthError(res, err)
  }
})
