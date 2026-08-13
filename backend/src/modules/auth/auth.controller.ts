import { Router } from "express"
import { z } from "zod"
import { authLimiter } from "../../lib/rate-limit"
import { logger } from "../../lib/logger"
import { requireAuth } from "./auth.middleware"
import { AuthError } from "./auth.errors"
import { changePassword, login, logout, refresh, register, requestOtp, verifyOtp } from "./auth.service"

export const authRouter = Router()

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number, e.g. +919876543210")

const registerSchema = z.object({
  username: z.string().min(2).max(40),
  phone: phoneSchema,
  email: z.string().email().optional(),
  password: z.string().min(8).max(72), // bcrypt truncates beyond 72 bytes
})

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const otpRequestSchema = z.object({
  phone: phoneSchema,
})

const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
  referralCode: z.string().max(40).optional(),
})

function sendAuthError(res: import("express").Response, err: unknown) {
  if (err instanceof AuthError) {
    const status =
      err.code === "EMAIL_TAKEN" || err.code === "PHONE_TAKEN"
        ? 409
        : err.code === "OTP_RATE_LIMITED"
          ? 429
          : err.code === "NO_PASSWORD_SET"
            ? 422
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
    const tokens = await register(parsed.data)
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
    const tokens = await login(parsed.data)
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

authRouter.post("/otp/request", authLimiter, async (req, res) => {
  const parsed = otpRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const result = await requestOtp(parsed.data.phone)
    res.json(result)
  } catch (err) {
    sendAuthError(res, err)
  }
})

authRouter.post("/otp/verify", authLimiter, async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const tokens = await verifyOtp(parsed.data.phone, parsed.data.code, parsed.data.referralCode)
    res.json(tokens)
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
