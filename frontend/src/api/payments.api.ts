import { apiRequest } from "./http"

export interface DepositOrder {
  /** Verapay-hosted checkout URL; credentials and provider metadata stay server-side. */
  paymentUrl: string
}

/** Creates a PayIn. The wallet is credited only after the verified provider callback. */
export function createDepositOrder(amount: number): Promise<DepositOrder> {
  return apiRequest<DepositOrder>("/api/payments/deposit", { method: "POST", body: { amount } })
}
