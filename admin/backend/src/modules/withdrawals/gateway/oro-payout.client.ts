import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"

export interface CreatePayoutInput {
  /** Echoed back as `cus_trx_id` in the payout callback backend/ receives — see withdrawals.service.ts. */
  trxId: string
  accountName: string
  accountNumber: string
  ifsc: string
  amount: number
}

export interface CreatePayoutResult {
  gatewayTrxId: string
  utr: string | null
  /** Raw status string from the gateway (e.g. "pending", "success"). */
  status: string
}

interface PayoutApiResponse {
  status: string
  message?: string
  data: {
    trx_id: string
    cus_trx_id: string
    utr: string | null
    status: string
  }
}

/**
 * Payout-only counterpart to backend/'s OroGatewayClient — admin/backend is
 * a separately installed app (own node_modules, own Dockerfile) and can't
 * import from backend/src, so this duplicates just the piece admin actually
 * calls (PayIn/deposit creation is entirely backend/'s concern). Same
 * aggregator and auth headers as PayIn, but a different host — see
 * PAYMENT_PAYOUT_BASE_URL's doc comment in lib/env.ts.
 */
export async function createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
  const res = await fetch(`${env.PAYMENT_PAYOUT_BASE_URL}/payout/data`, {
    method: "POST",
    headers: {
      "X-Client-Id": env.PAYMENT_GATEWAY_CLIENT_ID,
      "X-Secret-Id": env.PAYMENT_GATEWAY_SECRET_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      account_name: input.accountName,
      account_number: input.accountNumber,
      ifsc_code: input.ifsc,
      amount: input.amount,
      trxid: input.trxId,
    }),
  })

  // Unlike PayIn, the payout API's top-level `status` is a string
  // ("success"/"pending"), not a boolean — presence of `data` is what
  // actually distinguishes a real response from an error one.
  const json = (await res.json().catch(() => ({}))) as Partial<PayoutApiResponse> & { message?: string }
  if (!res.ok || !json.data) {
    logger.error({ status: res.status, body: json }, "Payout request failed")
    throw new Error(`Payout request failed with status ${res.status}${json.message ? `: ${json.message}` : ""}`)
  }

  return { gatewayTrxId: json.data.trx_id, utr: json.data.utr, status: json.data.status }
}

export interface PayoutStatusResult {
  status: string
  utr: string | null
}

interface CheckStatusApiResponse {
  status: string
  data: {
    resultCode: string
    resultStatus: string
    data: { TransactionId: string; TxnStatus: string; UTR: string | null }[]
  }
}

/**
 * Official reconciliation endpoint (Oro's own API docs, "Check Payout Status
 * API") — a fallback for when the payout webhook (backend/'s
 * /api/payments/payout/callback) never arrives, same problem class as the
 * PayIn side has no equivalent for. `apiRefNum` is Oro's own `trx_id` from
 * the original payout response (CreatePayoutResult.gatewayTrxId) — NOT our
 * `trxid`/`cus_trx_id`, confirmed against the documented example where
 * apiRefNum equals their trx_id, not the customer reference.
 */
export async function checkPayoutStatus(apiRefNum: string): Promise<PayoutStatusResult> {
  const res = await fetch(`${env.PAYMENT_PAYOUT_BASE_URL}/payout/v1/check-status`, {
    method: "POST",
    headers: {
      "X-Client-Id": env.PAYMENT_GATEWAY_CLIENT_ID,
      "X-Secret-Id": env.PAYMENT_GATEWAY_SECRET_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ apiRefNum }),
  })

  const json = (await res.json().catch(() => ({}))) as Partial<CheckStatusApiResponse> & { message?: string }
  const row = json.data?.data?.[0]
  if (!res.ok || !row) {
    logger.error({ status: res.status, body: json }, "Payout status check failed")
    throw new Error(`Payout status check failed with status ${res.status}${json.message ? `: ${json.message}` : ""}`)
  }

  return { status: row.TxnStatus, utr: row.UTR }
}
