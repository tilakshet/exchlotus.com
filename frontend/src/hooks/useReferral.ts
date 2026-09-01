import { useQuery } from "@tanstack/react-query"
import * as referralApi from "@/api/referral.api"

export function useMyReferral() {
  return useQuery({ queryKey: ["referral", "me"], queryFn: referralApi.getMyReferral })
}

export function useMyReferralStats() {
  return useQuery({ queryKey: ["referral", "stats"], queryFn: referralApi.getMyReferralStats })
}

export function useMyReferralHistory() {
  return useQuery({ queryKey: ["referral", "history"], queryFn: () => referralApi.getMyReferralHistory({ limit: 50 }) })
}
