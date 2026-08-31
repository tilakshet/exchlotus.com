import { Router } from "express"
import { z } from "zod"
import { authLimiter, captchaLimiter } from "../../lib/rate-limit"
import { logger } from "../../lib/logger"
import { requireAuth } from "./auth.middleware"
import { AuthError } from "./auth.errors"
import { generateCaptcha } from "./captcha.service"
import { changePassword, login, logout, refresh, register, requestPasswordReset, resetPassword } from "./auth.service"
import type { LoginEventContext } from "./login-event.service"

export const authRouter = Router()

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number, e.g. +919876543210")

const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"])

const captchaFields = {
  captchaId: z.string().uuid(),
  captchaCode: z.string().regex(/^\d{4}$/, "Enter the 4-digit CAPTCHA"),
}

const registerSchema = z.object({
  username: z.string().min(2).max(40),
  phone: phoneSchema,
  email: z.string().email().optional(),
  password: z.string().min(8).max(72), // bcrypt truncates beyond 72 bytes
  gender: genderSchema,
  ...captchaFields,
})

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
  ...captchaFields,
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  // Phone or email — requestPasswordReset tells them apart by "@".
  identifier: z.string().min(3).max(120),
  ...captchaFields,
})

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8).max(72), // matches registerSchema
  ...captchaFields,
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
          : err.code === "NO_PASSWORD_SET" || err.code === "CAPTCHA_INVALID" || err.code === "RESET_TOKEN_INVALID"
            ? 422
            : err.code === "ACCOUNT_SUSPENDED"
              ? 403
              : err.code === "CAPTCHA_UNAVAILABLE"
                ? 503
                : 401
    return res.status(status).json({ error: err.code, message: err.message })
  }
  throw err
}

// Numeric CAPTCHA, generated and validated server-side (see
// captcha.service.ts) — shared by login, register, forgot-password, and
// reset-password below rather than each form growing its own copy.
authRouter.post("/captcha", captchaLimiter, async (_req, res) => {
  try {
    res.json(await generateCaptcha())
  } catch (err) {
    sendAuthError(res, err)
  }
})

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

authRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const result = await requestPasswordReset(parsed.data)
    res.json(result)
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
