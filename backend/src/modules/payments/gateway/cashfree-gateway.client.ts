import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import type { CreatePayinOrderInput, CreatePayinOrderResult, PaymentGateway } from "./payment-gateway.interface"

interface CreateOrderResponse {
  order_id: string
  payment_session_id: string
  order_expiry_time?: string
  message?: string
}

interface OrderPayResponse {
  cf_payment_id?: string
  payment_message?: string
  data?: { payload?: { web?: string } }
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
 * payment-gateway.interface.ts). Two calls, matching Cashfree's documented
 * UPI Intent flow:
 *
 *   1. Create Order (`POST /pg/orders`) → `payment_session_id`
 *   2. Order Pay (`POST /pg/orders/sessions`, `payment_method.upi.channel:
 *      "link"`) → several device-specific links in `data.payload`
 *
 * `data.payload` carries both a `web` link (Cashfree's own hosted checkout
 * page — genuinely fulfills this interface's `paymentUrl` contract: "hosted
 * checkout page to redirect the player to") and per-app links (`default`,
 * `gpay`, `phonepe`, `paytm`, `bhim` — bare mobile app-intent deep links,
 * meant to be tapped on a phone, not redirected to from a browser). `web` is
 * the one used here deliberately: like every major Indian UPI gateway's
 * hosted checkout, it's the single page that auto-adapts — a scannable QR on
 * desktop, an app-picker on mobile — which is the deposit UX this needs to
 * match (see dashboard.account.deposit.tsx's isWebPaymentUrl: a real `web`
 * URL takes the plain redirect path, no UpiPaymentPanel involved — that
 * component exists specifically for Oro's occasional bare, page-less
 * `upi://` links, not for Cashfree's proper hosted page).
 *
 * Cashfree's sandbox can't demonstrate this responsive behavior — every
 * `data.payload` field, `web` included, resolves to the same flat test
 * simulator page in sandbox regardless of which one is used (confirmed by
 * directly following the `web` link) — so sandbox testing will look
 * different from Oro even though this is the field production actually
 * renders as an adaptive checkout page from.
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
        order_meta: { return_url: input.redirectUrl },
      }),
    })

    const orderJson = (await orderRes.json().catch(() => ({}))) as Partial<CreateOrderResponse>
    if (!orderRes.ok || !orderJson.payment_session_id) {
      logger.error({ status: orderRes.status, body: orderJson }, "Cashfree order creation failed")
      throw new Error(`Cashfree order creation failed with status ${orderRes.status}${orderJson.message ? `: ${orderJson.message}` : ""}`)
    }

    const payRes = await fetch(`${env.CASHFREE_BASE_URL}/pg/orders/sessions`, {
      method: "POST",
      headers: CASHFREE_HEADERS,
      body: JSON.stringify({
        payment_session_id: orderJson.payment_session_id,
        payment_method: { upi: { channel: "link" } },
      }),
    })

    const payJson = (await payRes.json().catch(() => ({}))) as Partial<OrderPayResponse>
    const paymentUrl = payJson.data?.payload?.web
    if (!payRes.ok || !paymentUrl) {
      logger.error({ status: payRes.status, body: payJson }, "Cashfree UPI intent request failed")
      throw new Error(`Cashfree UPI intent request failed with status ${payRes.status}${payJson.message ? `: ${payJson.message}` : ""}`)
    }

    logger.info({ orderId: input.orderId, paymentUrl, cfPaymentId: payJson.cf_payment_id }, "Cashfree PayIn order created")

    return {
      paymentUrl,
      gatewayTrxId: payJson.cf_payment_id ?? orderJson.order_id ?? "",
      expiresAt: orderJson.order_expiry_time ? new Date(orderJson.order_expiry_time) : new Date(Date.now() + 15 * 60 * 1000),
    }
  }
}

export const cashfreeGateway: PaymentGateway = new CashfreeGatewayClient()
