import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import type { CreatePayinOrderInput, CreatePayinOrderResult, PaymentGateway } from "./payment-gateway.interface"

interface PayinApiResponse {
  status: boolean
  message?: string
  order_id: string
  trx_id: string
  payment_url: string
  expire_at: number
}

/**
 * Adapter for the housholdbajar.com PayIn aggregator (deposits only — see
 * payment-gateway.interface.ts for why payout lives entirely in
 * admin/backend instead). Auth is a static client id + secret sent as
 * headers on every call, no token exchange. The PayIn callback carries no
 * signature — see payments.service.ts for how that gap is mitigated on the
 * receiving end; nothing here can compensate for it on the sending side.
 */
class OroGatewayClient implements PaymentGateway {
  async createPayinOrder(input: CreatePayinOrderInput): Promise<CreatePayinOrderResult> {
    const res = await fetch(`${env.PAYMENT_GATEWAY_BASE_URL}/payin/data`, {
      method: "POST",
      headers: {
        "X-Client-Id": env.PAYMENT_GATEWAY_CLIENT_ID,
        "X-Secret-Id": env.PAYMENT_GATEWAY_SECRET_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        amount: input.amount,
        mobile_number: input.mobileNumber,
        order_id: input.orderId,
        redirect_url: input.redirectUrl,
      }),
    })

    const json = (await res.json().catch(() => ({}))) as Partial<PayinApiResponse> & { message?: string }
    if (!res.ok || json.status === false || !json.payment_url) {
      logger.error({ status: res.status, body: json }, "PayIn order creation failed")
      throw new Error(`PayIn order creation failed with status ${res.status}${json.message ? `: ${json.message}` : ""}`)
    }

    return {
      paymentUrl: json.payment_url,
      gatewayTrxId: json.trx_id ?? "",
      expiresAt: new Date((json.expire_at ?? 0) * 1000),
    }
  }
}

export const paymentGateway: PaymentGateway = new OroGatewayClient()
