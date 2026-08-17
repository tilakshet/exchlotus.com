import { apiRequest } from "./http"

export interface DepositOrder {
  orderId: string
  paymentUrl: string
  expiresAt: string
}

/** Creates a real PayIn order — the wallet only actually credits once the gateway's callback lands (see backend payments.service.ts), never on this response alone. */
export function createDepositOrder(amount: number): Promise<DepositOrder> {
  return apiRequest<DepositOrder>("/api/payments/deposit", { method: "POST", body: { amount } })
}
