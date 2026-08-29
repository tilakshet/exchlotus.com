import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import type { CreatePayinOrderInput, CreatePayinOrderResult, PaymentGateway } from "./payment-gateway.interface"

interface CreateOrderResponse {
  order_id: string
  payment_session_id: string
  order_expiry_time?: string
  message?: string
}

const CASHFREE_HEADERS = {
  "x-client-id": env.CASHFREE_CLIENT_ID,
  "x-client-secret": env.CASHFREE_CLIENT_SECRET,
  "x-api-version": env.CASHFREE_API_VERSION,
  "Content-Type": "application/json",
  Accept: "application/json",
}

/**
 * Adapter for Cashfree PG (deposits only — payout stays Oro-only, see
 * payment-gateway.interface.ts). Only ever calls Create Order (`POST
 * /pg/orders`) — the server-to-server "Order Pay" API that would otherwise
 * turn the resulting `payment_session_id` into a ready-made hosted
 * `paymentUrl` needs separate account approval from Cashfree (confirmed
 * live: `POST /pg/orders/sessions` fails with `s2s_enabled_not_approved`,
 * "Please reach out to care@cashfree.com" — an account-level gate, not
 * something fixable here). Rather than wait on that approval, this returns
 * the bare `payment_session_id` instead and lets the frontend use
 * Cashfree's own checkout SDK (`cashfree.checkout({ paymentSessionId })`,
 * dashboard.account.deposit.tsx) — the standard client-side integration
 * every merchant account gets by default, no S2S approval required, and the
 * same hosted checkout page ("web") this was already trying to reach.
 *
 * Cashfree's webhook (unlike Oro's) is signature-verified — see
 * payments-callback.controller.ts's `/payin/callback/cashfree` route.
 */
class CashfreeGatewayClient implements PaymentGateway {
  async createPayinOrder(input: CreatePayinOrderInput): Promise<CreatePayinOrderResult> {
    const orderRes = await fetch(`${env.CASHFREE_BASE_URL}/pg/orders`, {
      method: "POST",
      headers: CASHFREE_HEADERS,
      body: JSON.stringify({
        order_id: input.orderId,
        order_amount: input.amount,
        order_currency: "INR",
        customer_details: {
          customer_id: input.orderId,
          customer_name: input.name,
          customer_phone: input.mobileNumber,
        },
        // Restricts the hosted checkout page to UPI only (QR + UPI app
        // options) — otherwise it shows every method Cashfree supports
        // (cards, wallets, net banking, paylater, EMI), which doesn't match
        // this deposit flow's UPI-only design (see Oro's equivalent, which
        // only ever collects via UPI).
        order_meta: { return_url: input.redirectUrl, payment_methods: "upi" },
      }),
    })

    const orderJson = (await orderRes.json().catch(() => ({}))) as Partial<CreateOrderResponse>
    if (!orderRes.ok || !orderJson.payment_session_id) {
      logger.error({ status: orderRes.status, body: orderJson }, "Cashfree order creation failed")
      throw new Error(`Cashfree order creation failed with status ${orderRes.status}${orderJson.message ? `: ${orderJson.message}` : ""}`)
    }

    logger.info({ orderId: input.orderId, paymentSessionId: orderJson.payment_session_id }, "Cashfree PayIn order created")

    return {
      paymentSessionId: orderJson.payment_session_id,
      cashfreeMode: env.CASHFREE_BASE_URL.includes("sandbox") ? "sandbox" : "production",
      gatewayTrxId: orderJson.order_id ?? "",
      expiresAt: orderJson.order_expiry_time ? new Date(orderJson.order_expiry_time) : new Date(Date.now() + 15 * 60 * 1000),
    }
  }
}

export const cashfreeGateway: PaymentGateway = new CashfreeGatewayClient()
