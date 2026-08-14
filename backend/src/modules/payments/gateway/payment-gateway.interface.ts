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
  /** Hosted checkout page to redirect the player to. */
  paymentUrl: string
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
