import { apiRequest } from "./http"

export interface DepositOrder {
  orderId: string
  /** Present for a gateway (Oro) that gives a ready-made hosted page — exactly one of paymentUrl/paymentSessionId is present. */
  paymentUrl?: string
  /** Cashfree's payment_session_id — when present, must be handed to Cashfree's own checkout SDK (see dashboard.account.deposit.tsx) rather than redirected to directly. */
  paymentSessionId?: string
  /** Only meaningful alongside paymentSessionId. */
  cashfreeMode?: "sandbox" | "production"
  expiresAt: string
}

/** Creates a real PayIn order — the wallet only actually credits once the gateway's callback lands (see backend payments.service.ts), never on this response alone. */
export function createDepositOrder(amount: number): Promise<DepositOrder> {
  return apiRequest<DepositOrder>("/api/payments/deposit", { method: "POST", body: { amount } })
}
