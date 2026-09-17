import { Router } from "express"
import { requireAuth } from "../auth/auth.middleware"
import { panVerificationLimiter } from "../../lib/rate-limit"
import { verifyPanSchema } from "./kyc.validators"
import { getMyKyc, KycError, verifyPan } from "./kyc.service"

export const kycRouter = Router()
kycRouter.use(requireAuth)

const KYC_ERROR_STATUS: Record<KycError["code"], number> = {
  PHONE_NOT_VERIFIED: 422,
  NO_PHONE_ON_FILE: 422,
  PAN_ALREADY_USED: 422,
  PAN_INVALID: 422,
  PAN_NOT_VERIFIED: 422,
  QRX_UNAVAILABLE: 503,
  QRX_INVALID_RESPONSE: 502,
}

kycRouter.get("/me", async (req, res) => {
  res.json(await getMyKyc(req.auth!.sub))
})

kycRouter.post("/verify-pan", panVerificationLimiter, async (req, res) => {
  const parsed = verifyPanSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ success: false, message: "Please enter a valid PAN number." })

  try {
    res.json(await verifyPan(req.auth!.sub, parsed.data.pan))
  } catch (err) {
    if (err instanceof KycError) {
      return res.status(KYC_ERROR_STATUS[err.code]).json({ success: false, error: err.code, message: err.message })
    }
    throw err
  }
})
