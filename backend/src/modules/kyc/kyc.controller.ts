import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../auth/auth.middleware"
import { AuthError } from "../auth/auth.errors"
import { parseKycUpload } from "../../lib/uploads"
import { submitKycSchema } from "./kyc.validators"
import { confirmPhoneVerificationOtp, getMyKyc, KycError, requestPhoneVerificationOtp, submitKyc } from "./kyc.service"

export const kycRouter = Router()
kycRouter.use(requireAuth)

const KYC_ERROR_STATUS: Record<KycError["code"], number> = {
  ALREADY_APPROVED: 409,
  ALREADY_PENDING: 409,
  PHONE_NOT_VERIFIED: 422,
  NO_PHONE_ON_FILE: 422,
}

kycRouter.get("/me", async (req, res) => {
  res.json(await getMyKyc(req.auth!.sub))
})

kycRouter.post("/phone/request-otp", async (req, res) => {
  try {
    res.json(await requestPhoneVerificationOtp(req.auth!.sub))
  } catch (err) {
    if (err instanceof KycError) {
      return res.status(KYC_ERROR_STATUS[err.code]).json({ error: err.code, message: err.message })
    }
    if (err instanceof AuthError) {
      return res.status(err.code === "OTP_RATE_LIMITED" ? 429 : 422).json({ error: err.code, message: err.message })
    }
    throw err
  }
})

const verifyPhoneOtpSchema = z.object({ code: z.string().length(6) })

kycRouter.post("/phone/verify-otp", async (req, res) => {
  const parsed = verifyPhoneOtpSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }
  try {
    await confirmPhoneVerificationOtp(req.auth!.sub, parsed.data.code)
    res.status(204).send()
  } catch (err) {
    if (err instanceof KycError) {
      return res.status(KYC_ERROR_STATUS[err.code]).json({ error: err.code, message: err.message })
    }
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.code, message: err.message })
    }
    throw err
  }
})

kycRouter.post("/submit", async (req, res) => {
  const upload = await parseKycUpload(req, res)
  if (upload.error || !upload.files) {
    return res.status(422).json({ error: "VALIDATION_ERROR", message: upload.error ?? "Both images are required." })
  }

  const parsed = submitKycSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues })
  }

  try {
    const submission = await submitKyc(req.auth!.sub, {
      panNumber: parsed.data.panNumber,
      panCardFile: upload.files.panCard,
      photoFile: upload.files.photo,
    })
    res.status(201).json({ id: submission.id, status: submission.status })
  } catch (err) {
    if (err instanceof KycError) {
      return res.status(KYC_ERROR_STATUS[err.code]).json({ error: err.code, message: err.message })
    }
    throw err
  }
})
