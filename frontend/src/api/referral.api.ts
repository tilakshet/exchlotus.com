import { apiRequest } from "./http"

export interface ReferralSummary {
  code: string
  link: string
  enabled: boolean
  terms: string | null
  campaign: {
    name: string | null
    referrerCashReward: number
    referrerCoinReward: number
    referredCashReward: number
    referredCoinReward: number
    endAt: string | null
  }
}

export function getMyReferral(): Promise<ReferralSummary> {
  return apiRequest<ReferralSummary>("/api/referral")
}

export interface ReferralStats {
  totalReferrals: number
  pending: number
  qualified: number
  rewarded: number
  rejected: number
  totalCashEarned: number
  totalCoinsEarned: number
}

export function getMyReferralStats(): Promise<ReferralStats> {
  return apiRequest<ReferralStats>("/api/referral/stats")
}

export interface ReferralHistoryItem {
  id: string
  friend: string
  phoneMasked: string | null
  registeredAt: string
  status: "PENDING" | "REGISTERED" | "QUALIFIED" | "REWARDED" | "REJECTED" | "CANCELLED"
  qualifiedAt: string | null
  rewardedAt: string | null
  cashReward: number
  coinReward: number
}

export function getMyReferralHistory(params: { cursor?: string; limit?: number } = {}): Promise<{ items: ReferralHistoryItem[]; nextCursor: string | null }> {
  return apiRequest<{ items: ReferralHistoryItem[]; nextCursor: string | null }>("/api/referral/history", { query: params })
}
