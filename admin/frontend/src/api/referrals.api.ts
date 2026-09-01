import { apiRequest } from "./http"

export type ReferralStatus = "PENDING" | "REGISTERED" | "QUALIFIED" | "REWARDED" | "REJECTED" | "CANCELLED"
export type ReferralRiskStatus = "NORMAL" | "REVIEW" | "BLOCKED"
export type QualificationRule = "REGISTRATION_ONLY" | "VERIFICATION" | "DEPOSIT" | "ACTIVITY" | "MULTIPLE"
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED"

export interface ReferralListItem {
  id: string
  referrer: { id: string; username: string; phone: string | null }
  referred: { id: string; username: string; phone: string | null }
  referralCode: string
  campaign: { id: string; name: string } | null
  status: ReferralStatus
  riskStatus: ReferralRiskStatus
  riskScore: number
  cashReward: number
  coinReward: number
  registeredAt: string
  qualifiedAt: string | null
  rewardedAt: string | null
  createdAt: string
}

export interface ListReferralsParams {
  search?: string
  status?: ReferralStatus
  riskStatus?: ReferralRiskStatus
  campaignId?: string
  from?: string
  to?: string
  cursor?: string
  limit?: number
}

export function listReferrals(params: ListReferralsParams = {}) {
  return apiRequest<{ items: ReferralListItem[]; nextCursor: string | null }>("/admin-api/referrals", {
    query: params as Record<string, string | number | undefined>,
  })
}

export interface ReferralDetail extends Omit<ReferralListItem, "cashReward" | "coinReward" | "campaign"> {
  registrationIp: string | null
  registrationUserAgent: string | null
  adminNote: string | null
  reviewedByAdminId: string | null
  campaign: {
    id: string
    name: string
    referrerCashReward: number
    referredCashReward: number
    qualificationRule: QualificationRule
  } | null
  riskFlags: { id: string; type: string; detail: string | null; createdAt: string }[]
  rewards: {
    id: string
    type: string
    amount: number
    currency: string
    status: string
    reference: string
    description: string | null
    createdAt: string
  }[]
}

export function getReferral(id: string) {
  return apiRequest<ReferralDetail>(`/admin-api/referrals/${id}`)
}

export function approveReferral(id: string) {
  return apiRequest<{ id: string; status: string }>(`/admin-api/referrals/${id}/approve`, { method: "POST" })
}

export function rejectReferral(id: string, reason: string) {
  return apiRequest<{ id: string; status: string }>(`/admin-api/referrals/${id}/reject`, { method: "POST", body: { reason } })
}

export function reverseReferralReward(id: string, reason: string) {
  return apiRequest<{ id: string; reversedCount: number }>(`/admin-api/referrals/${id}/reverse`, { method: "POST", body: { reason } })
}

export function reviewReferralRisk(id: string, riskStatus: ReferralRiskStatus, note?: string) {
  return apiRequest<{ id: string; riskStatus: string }>(`/admin-api/referrals/${id}/review`, { method: "POST", body: { riskStatus, note } })
}

export interface ReferralDashboardSummary {
  totalReferrals: number
  pending: number
  qualified: number
  rewarded: number
  rejected: number
  totalCashRewarded: number
  totalCoinsIssued: number
  activeReferrers: number
  topReferrers: { id: string; username: string; count: number }[]
  conversionRatePct: number
}

export function getReferralDashboard() {
  return apiRequest<ReferralDashboardSummary>("/admin-api/referrals/dashboard")
}

export interface ReferralSettings {
  id: string
  enabled: boolean
  qualificationRule: QualificationRule
  minDepositAmount: number
  minActivityAmount: number
  referrerCashReward: number
  referrerCoinReward: number
  referredCashReward: number
  referredCoinReward: number
  rewardExpiryDays: number | null
  maxRewardsPerUser: number | null
  maxReferredPerUser: number | null
  dailyReferralLimit: number | null
  monthlyReferralLimit: number | null
  minAccountAgeDays: number
  kycRequired: boolean
  rewardCooldownHours: number
  allowedCountries: string[]
  termsText: string | null
  updatedAt: string
}

export function getReferralSettings() {
  return apiRequest<ReferralSettings>("/admin-api/referrals/settings")
}

export function updateReferralSettings(input: Partial<Omit<ReferralSettings, "id" | "updatedAt">>) {
  return apiRequest<ReferralSettings>("/admin-api/referrals/settings", { method: "PATCH", body: input })
}

export interface ReferralCampaign {
  id: string
  name: string
  description: string | null
  startAt: string
  endAt: string
  status: CampaignStatus
  qualificationRule: QualificationRule
  referrerCashReward: number
  referrerCoinReward: number
  referredCashReward: number
  referredCoinReward: number
  minDepositAmount: number
  minActivityAmount: number
  maxRewards: number | null
  expiryDays: number | null
  createdAt: string
  updatedAt: string
}

export type CampaignInput = Omit<ReferralCampaign, "id" | "createdAt" | "updatedAt">

export function listCampaigns() {
  return apiRequest<ReferralCampaign[]>("/admin-api/referrals/campaigns")
}

export function createCampaign(input: Partial<CampaignInput> & Pick<CampaignInput, "name" | "startAt" | "endAt">) {
  return apiRequest<ReferralCampaign>("/admin-api/referrals/campaigns", { method: "POST", body: input })
}

export function updateCampaign(id: string, input: Partial<CampaignInput>) {
  return apiRequest<ReferralCampaign>(`/admin-api/referrals/campaigns/${id}`, { method: "PATCH", body: input })
}

export function deleteCampaign(id: string) {
  return apiRequest<void>(`/admin-api/referrals/campaigns/${id}`, { method: "DELETE" })
}
