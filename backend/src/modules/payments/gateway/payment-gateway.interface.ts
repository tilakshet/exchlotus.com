export interface CreatePayinOrderInput {
  /** Our own PaymentOrder.id — sent as the gateway's `order_id`, and what its callback echoes back. */
  orderId: string
  amount: number
  name: string
  mobileNumber: string
  /** Where the player's browser returns to after paying — not where the payment result is reported (that's the callback). */
  redirectUrl: string
}

export interface CreatePayinOrderResult {
  /** Hosted checkout page to redirect the player to directly — undefined for
   * a gateway that needs its own client-side checkout SDK instead (see
   * paymentSessionId below); exactly one of the two is always present. */
  paymentUrl?: string
  /** Cashfree's payment_session_id (cashfree-gateway.client.ts) — its
   * server-to-server Order Pay API (what would otherwise turn this into a
   * plain paymentUrl) needs separate account approval from Cashfree, so the
   * frontend instead loads Cashfree's own checkout SDK and calls
   * `cashfree.checkout({ paymentSessionId })`, which needs no such approval.
   * Undefined for gateways (Oro) that return a real paymentUrl instead. */
  paymentSessionId?: string
  /** Only meaningful alongside paymentSessionId — which Cashfree SDK mode
   * the frontend must initialize with to match the account these
   * credentials belong to. */
  cashfreeMode?: "sandbox" | "production"
  gatewayTrxId: string
  expiresAt: Date
}

// Payout (withdrawal) only ever gets called from admin/backend's approval
// flow (admin/backend/src/modules/withdrawals/gateway/oro-payout.client.ts)
// — that's the whole point of the admin-approval design (see
// wallet.service.ts requestWithdrawal). backend/ never calls it, so this
// interface only covers PayIn.
export interface PaymentGateway {
  createPayinOrder(input: CreatePayinOrderInput): Promise<CreatePayinOrderResult>
}
