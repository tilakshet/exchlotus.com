import { apiRequest } from "./http"

export type PaymentOrderStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED"

export interface PaymentOrderItem {
  id: string
  player: { id: string; username: string; phone: string | null }
  amount: number
  currency: string
  status: PaymentOrderStatus
  gatewayTrxId: string | null
  createdAt: string
  updatedAt: string
}

export interface ListPaymentOrdersParams {
  status?: PaymentOrderStatus
  search?: string
  dateFrom?: string
  dateTo?: string
  cursor?: string
  limit?: number
}

export function listPaymentOrders(params: ListPaymentOrdersParams = {}) {
  return apiRequest<{ items: PaymentOrderItem[]; nextCursor: string | null }>("/admin-api/payments", {
    query: params as Record<string, string | number | undefined>,
  })
}
