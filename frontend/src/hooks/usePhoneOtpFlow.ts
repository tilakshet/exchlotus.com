import { useCallback, useState } from "react"
import { useAuth } from "./useAuth"
import { ApiError, friendlyErrorMessage } from "@/api/api-error"
import type { Gender } from "@/types/profile"

const RESEND_COOLDOWN_SECONDS = 60

/**
 * Shared two-step phone→OTP state machine behind both "Login with OTP" and
 * "Sign Up" (verifyOtp auto-provisions an account for a new number, so
 * signup and OTP login are the same backend call — the two forms differ
 * only in which extra fields they collect, not in this flow).
 */
export function usePhoneOtpFlow() {
  const { requestOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [devCode, setDevCode] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const id = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [])

  const request = useCallback(
    async (localNumber: string) => {
      setFormError(null)
      const fullPhone = `+91${localNumber}`
      try {
        const result = await requestOtp(fullPhone)
        setPhone(fullPhone)
        setDevCode(result.devCode ?? null)
        setStep("code")
        startCooldown()
      } catch (err) {
        setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err))
      }
    },
    [requestOtp, startCooldown]
  )

  const resend = useCallback(async () => {
    if (cooldown > 0 || !phone) return
    setFormError(null)
    try {
      const result = await requestOtp(phone)
      setDevCode(result.devCode ?? null)
      startCooldown()
    } catch (err) {
      setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err))
    }
  }, [cooldown, phone, requestOtp, startCooldown])

  const verify = useCallback(
    async (code: string, referralCode: string | undefined, onSuccess: () => void, gender?: Gender) => {
      setFormError(null)
      try {
        await verifyOtp(phone, code, referralCode, gender)
        onSuccess()
      } catch (err) {
        setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err))
      }
    },
    [phone, verifyOtp]
  )

  return { step, setStep, phone, devCode, formError, cooldown, request, resend, verify }
}
