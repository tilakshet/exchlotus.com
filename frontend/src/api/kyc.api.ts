import { apiRequest } from "./http"
import type { KycStatus } from "@/types/profile"

export interface MyKycStatus {
  status: KycStatus
  phoneVerified: boolean
  latestSubmission: {
    submittedAt: string
    reviewedAt: string | null
    rejectionReason: string | null
  } | null
}

export function getMyKyc(): Promise<MyKycStatus> {
  return apiRequest<MyKycStatus>("/api/kyc/me")
}

export function requestPhoneVerificationOtp(): Promise<{ devCode?: string }> {
  return apiRequest<{ devCode?: string }>("/api/kyc/phone/request-otp", { method: "POST" })
}

export function verifyPhoneVerificationOtp(code: string): Promise<void> {
  return apiRequest<void>("/api/kyc/phone/verify-otp", { method: "POST", body: { code } })
}

export function submitKyc(input: { panNumber: string; panCard: File; photo: File }): Promise<{ id: string; status: KycStatus }> {
  const body = new FormData()
  body.set("panNumber", input.panNumber)
  body.set("panCard", input.panCard)
  body.set("photo", input.photo)
  return apiRequest<{ id: string; status: KycStatus }>("/api/kyc/submit", { method: "POST", body })
}
