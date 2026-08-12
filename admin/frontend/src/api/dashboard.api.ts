import { apiRequest } from "./http"

export interface DashboardSummary {
  users: { total: number; newToday: number; active: number; suspended: number }
  finance: {
    depositsTodayAmount: number
    depositsTodayCount: number
    depositsChangePct: number
    withdrawalsTodayAmount: number
    withdrawalsTodayCount: number
    withdrawalsChangePct: number
    totalWalletBalance: number
  }
  activity: { ledgerEntriesToday: number }
  admins: { activeCount: number; withoutMfaCount: number }
  generatedAt: string
}

export function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/admin-api/dashboard/summary")
}
