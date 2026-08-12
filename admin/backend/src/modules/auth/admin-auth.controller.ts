import { Router } from "express"
import { z } from "zod"
import { adminAuthLimiter } from "../../lib/rate-limit"
import { logger } from "../../lib/logger"
import { AdminApiError, statusForError } from "../../lib/api-error"
import { requireAdminAuth } from "./admin-auth.middleware"
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  login,
  logout,
  refresh,
  verifyMfaLogin,
} from "./admin-auth.service"

export const adminAuthRouter = Router()

function clientIp(req: import("express").Request): string {
  return req.ip ?? "unknown"
}

function sendAuthError(res: import("express").Response, err: unknown) {
  if (err instanceof AdminApiError) {
    return res.status(statusForError(err)).json({ error: err.code, message: err.message })
  }
  throw err
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

adminAuthRouter.post("/login", adminAuthLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const result = await login(parsed.data.email, parsed.data.password, clientIp(req), req.header("user-agent") ?? "unknown")
    res.json(result)
  } catch (err) {
    sendAuthError(res, err)
  }
})

const mfaVerifySchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6),
})

adminAuthRouter.post("/mfa/verify", adminAuthLimiter, async (req, res) => {
  const parsed = mfaVerifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const tokens = await verifyMfaLogin(
      parsed.data.challengeToken,
      parsed.data.code,
      clientIp(req),
      req.header("user-agent") ?? "unknown"
    )
    res.json(tokens)
  } catch (err) {
    sendAuthError(res, err)
  }
})

const refreshSchema = z.object({ refreshToken: z.string().min(1) })

adminAuthRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    const tokens = await refresh(parsed.data.refreshToken, clientIp(req), req.header("user-agent") ?? "unknown")
    res.json(tokens)
  } catch (err) {
    sendAuthError(res, err)
  }
})

adminAuthRouter.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await logout(parsed.data.refreshToken)
    res.status(204).send()
  } catch (err) {
    logger.error({ err }, "Admin logout failed")
    res.status(500).json({ error: "INTERNAL_ERROR" })
  }
})

adminAuthRouter.get("/me", requireAdminAuth, (req, res) => {
  res.json(req.adminAuth)
})

adminAuthRouter.post("/mfa/enroll", requireAdminAuth, async (req, res) => {
  try {
    const result = await beginMfaEnrollment(req.adminAuth!.id)
    res.json(result)
  } catch (err) {
    sendAuthError(res, err)
  }
})

const mfaConfirmSchema = z.object({ code: z.string().length(6) })

adminAuthRouter.post("/mfa/enroll/confirm", requireAdminAuth, async (req, res) => {
  const parsed = mfaConfirmSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await confirmMfaEnrollment(req.adminAuth!.id, parsed.data.code)
    res.status(204).send()
  } catch (err) {
    sendAuthError(res, err)
  }
})

const mfaDisableSchema = z.object({ password: z.string().min(1) })

adminAuthRouter.post("/mfa/disable", requireAdminAuth, async (req, res) => {
  const parsed = mfaDisableSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await disableMfa(req.adminAuth!.id, parsed.data.password)
    res.status(204).send()
  } catch (err) {
    sendAuthError(res, err)
  }
})
