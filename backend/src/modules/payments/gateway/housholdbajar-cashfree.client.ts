import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import type { CreatePayinOrderInput, CreatePayinOrderResult, PaymentGateway } from "./payment-gateway.interface"

interface CreateOrderResponse {
  status: boolean
  message?: string
  order_id?: string
  cashfree_order_id?: string
  trx_id?: string
  // Typed loosely and coerced below rather than trusted as `number` — this
  // is an external response, and a JSON API returning "100" instead of 100
  // is common enough that a strict type check must not silently skip the
  // amount-match validation.
  amount?: number | string
  payment_url?: string
}

const REQUEST_TIMEOUT_MS = 20_000

// Compared against payment_url's own host below — HousholdBajar's create
// response is otherwise trusted at face value, and a hosted checkout page on
// an unexpected domain must never be handed to the browser as a redirect
// target (open-redirect risk if that field were ever compromised/mistyped).
const housholdbajarHost = safeHost(env.EXCHLOTUS_PAYMENT_API_URL)

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ""
  }
}

function isTrustedPaymentUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && parsed.host === housholdbajarHost
  } catch {
    return false
  }
}

/**
 * Adapter for HousholdBajar's Cashfree-relay endpoint (POST /api/cashfree/create).
 * HousholdBajar holds the real Cashfree credentials and talks to Cashfree
 * server-to-server on Exchlotus's behalf — this client never sees, sends, or
 * stores a Cashfree secret, only EXCHLOTUS_PAYMENT_API_KEY (authenticates
 * *this* server to HousholdBajar) and EXCHLOTUS_CALLBACK_SECRET (verifies
 * HousholdBajar's callback, see payments-callback.controller.ts).
 *
 * Unlike direct-Cashfree (cashfree-gateway.client.ts), HousholdBajar returns
 * a ready-made hosted `payment_url` — no client-side checkout SDK needed,
 * same shape as Oro's response.
 */
class HousholdbajarCashfreeClient implements PaymentGateway {
  async createPayinOrder(input: CreatePayinOrderInput): Promise<CreatePayinOrderResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(`${env.EXCHLOTUS_PAYMENT_API_URL}/api/cashfree/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Exchlotus-Key": env.EXCHLOTUS_PAYMENT_API_KEY,
        },
        body: JSON.stringify({
          order_id: input.orderId,
          amount: input.amount,
          name: input.name,
          email: input.email,
          // HousholdBajar's live controller validates this field as `mobile`
          // — confirmed against its actual 422 response (2026-09-15), which
          // named `mobile` as required. Not `contact`, despite that being
          // the field name in the originally-given request-body example.
          mobile: input.mobileNumber,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      logger.error({ orderId: input.orderId, err: err instanceof Error ? err.message : String(err) }, "HousholdBajar create-order request failed")
      throw new Error("HousholdBajar create-order request failed")
    } finally {
      clearTimeout(timeout)
    }

    const body = (await res.json().catch(() => ({}))) as Partial<CreateOrderResponse>

    if (!res.ok || body.status !== true) {
      logger.error({ orderId: input.orderId, httpStatus: res.status, body }, "HousholdBajar order creation failed")
      throw new Error(`HousholdBajar order creation failed with status ${res.status}${body.message ? `: ${body.message}` : ""}`)
    }
    if (body.order_id !== input.orderId) {
      logger.error({ sent: input.orderId, received: body.order_id }, "HousholdBajar response order_id mismatch")
      throw new Error("HousholdBajar response order_id does not match the order we created")
    }
    if (body.amount !== undefined) {
      const receivedAmount = typeof body.amount === "number" ? body.amount : Number(body.amount)
      if (!Number.isFinite(receivedAmount) || receivedAmount !== input.amount) {
        logger.error({ orderId: input.orderId, sent: input.amount, received: body.amount }, "HousholdBajar response amount mismatch")
        throw new Error("HousholdBajar response amount does not match the order we created")
      }
    }
    if (!body.payment_url || !isTrustedPaymentUrl(body.payment_url)) {
      logger.error({ orderId: input.orderId }, "HousholdBajar response missing or untrusted payment_url")
      throw new Error("HousholdBajar response did not include a valid payment_url")
    }

    logger.info({ orderId: input.orderId, cashfreeOrderId: body.cashfree_order_id, trxId: body.trx_id }, "HousholdBajar PayIn order created")

    return {
      paymentUrl: body.payment_url,
      gatewayTrxId: body.trx_id ?? "",
      cashfreeOrderId: body.cashfree_order_id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  }
}

export const housholdbajarGateway: PaymentGateway = new HousholdbajarCashfreeClient()
