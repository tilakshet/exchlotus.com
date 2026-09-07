import { apiRequest, fetchAuthenticatedImageUrl } from "./http"

export type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED"

export interface KycListItem {
  id: string
  player: { id: string; username: string; phone: string | null; externalId: string }
  panNumber: string
  status: KycStatus
  rejectionReason: string | null
  submittedAt: string
  reviewedAt: string | null
  verificationSource: "MANUAL" | "QRX_PAN_API"
  providerRequestId: string | null
  verifiedAt: string | null
  hasDocuments?: boolean
}

export interface KycDetail extends KycListItem {
  player: KycListItem["player"] & { status: string; phoneVerified: boolean }
  panType: string | null
  fullName: string | null
  firstName: string | null
  middleName: string | null
  lastName: string | null
  gender: string | null
  aadhaarNumber: string | null
  aadhaarLinked: boolean | null
  dateOfBirth: string | null
  buildingName: string | null
  locality: string | null
  streetName: string | null
  pincode: string | null
  city: string | null
  state: string | null
  country: string | null
  mobile: string | null
  email: string | null
  provider: string | null
}

export function listKycSubmissions(params: { status?: KycStatus; search?: string; cursor?: string; limit?: number }) {
  return apiRequest<{ items: KycListItem[]; nextCursor: string | null }>("/admin-api/kyc", { query: params })
}

export function getKycSubmission(id: string) {
  return apiRequest<KycDetail>(`/admin-api/kyc/${id}`)
}

export function getKycDocumentUrl(id: string, type: "pan" | "photo") {
  return fetchAuthenticatedImageUrl(`/admin-api/kyc/${id}/document/${type}`)
}

export function reviewKyc(id: string, decision: "APPROVED" | "REJECTED", reason?: string) {
  return apiRequest<{ id: string; status: KycStatus }>(`/admin-api/kyc/${id}/review`, { method: "PATCH", body: { decision, reason } })
}
