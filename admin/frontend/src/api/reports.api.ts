import { apiRequest } from "./http"

export interface UserGrowthPoint {
  day: string
  newUsers: number
}

export interface FinanceTrendPoint {
  day: string
  deposits: number
  withdrawals: number
}

export interface PopularGameRow {
  gameId: string
  gameName: string | null
  betCount: number
  betVolume: number
}

export interface FinanceBreakdownRow {
  day: string
  type: string
  count: number
  total: number
}

export interface ActiveUsersPoint {
  day: string
  activeUsers: number
}

export interface RevenueSummary {
  depositsAmount: number
  depositsCount: number
  withdrawalsAmount: number
  withdrawalsCount: number
  netCashFlow: number
  betVolume: number
  betCount: number
  winVolume: number
  winCount: number
  wageredMinusPaidOut: number
  totalWalletBalance: number
}

export type ReportRangeParams = {
  dateFrom?: string
  dateTo?: string
}

export function getUserGrowth(params: ReportRangeParams = {}) {
  return apiRequest<UserGrowthPoint[]>("/admin-api/reports/user-growth", { query: params })
}

export function getFinanceTrend(params: ReportRangeParams = {}) {
  return apiRequest<FinanceTrendPoint[]>("/admin-api/reports/finance-trend", { query: params })
}

export function getPopularGames(params: ReportRangeParams & { limit?: number } = {}) {
  return apiRequest<PopularGameRow[]>("/admin-api/reports/popular-games", { query: params })
}

export function getFinanceBreakdown(params: ReportRangeParams = {}) {
  return apiRequest<FinanceBreakdownRow[]>("/admin-api/reports/finance-breakdown", { query: params })
}

export function getActiveUsers(params: ReportRangeParams = {}) {
  return apiRequest<ActiveUsersPoint[]>("/admin-api/reports/active-users", { query: params })
}

export function getRevenueSummary(params: ReportRangeParams = {}) {
  return apiRequest<RevenueSummary>("/admin-api/reports/revenue-summary", { query: params })
}
