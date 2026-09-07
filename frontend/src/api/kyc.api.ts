import { apiRequest } from "./http"
import type { KycStatus } from "@/types/profile"

export interface MyKycStatus {
  status: KycStatus
  phoneVerified: boolean
  latestSubmission: {
    submittedAt: string
    reviewedAt: string | null
    rejectionReason: string | null
    pan: string
    fullName: string | null
    panType: string | null
    gender: string | null
    dateOfBirth: string | null
    aadhaarLinked: boolean | null
    verificationSource: "MANUAL" | "QRX_PAN_API"
  } | null
}

export function getMyKyc(): Promise<MyKycStatus> {
  return apiRequest<MyKycStatus>("/api/kyc/me")
}

export function submitKyc(input: { panNumber: string; panCard: File; photo: File }): Promise<{ id: string; status: KycStatus }> {
  const body = new FormData()
  body.set("panNumber", input.panNumber)
  body.set("panCard", input.panCard)
  body.set("photo", input.photo)
  return apiRequest<{ id: string; status: KycStatus }>("/api/kyc/submit", { method: "POST", body })
}

export function verifyPan(pan: string) {
  return apiRequest<{
    success: true
    message: string
    kycStatus: KycStatus
    data: {
      pan: string
      fullname: string | null
      panType: string | null
      gender: string | null
      dob: string | null
      aadhaarLinked: boolean | null
      verificationSource: "MANUAL" | "QRX_PAN_API"
    } | null
  }>("/api/kyc/verify-pan", { method: "POST", body: { pan } })
}
