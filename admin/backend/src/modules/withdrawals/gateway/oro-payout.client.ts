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
  // Oro documents two shapes for this same endpoint: `data`-wrapped when the
  // payout is still pending, flat (these same fields directly at the top
  // level, no `data`) when it resolves immediately as a success — see their
  // own "Response - Initial (Pending)" vs "Response - Final (Success)"
  // examples. Handling only the wrapped shape would misreport an
  // instantly-completed payout (real money already sent) as a failed
  // request, since `data` wouldn't exist on the flat response.
  data?: {
    trx_id: string
    cus_trx_id: string
    utr: string | null
    status: string
  }
  trx_id?: string
  utr?: string | null
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

  // Read as text first, not res.json() directly — Oro has been observed
  // returning a genuine 200 with a completely empty body (confirmed via
  // curl: Content-Length: 0, not a client-side rendering artifact), which
  // res.json() can't distinguish from a real parse failure. Reading raw
  // text lets the three failure shapes below get a distinct, actionable
  // message instead of one generic "request failed" for all of them.
  const rawBody = await res.text()
  let json: Partial<PayoutApiResponse> = {}
  try {
    if (rawBody) json = JSON.parse(rawBody)
  } catch {
    // leave json as {} — handled by the !result branch below via the
    // isEmptyBody/reason logic, same as a truly empty body.
  }

  // Unlike PayIn, the payout API's top-level `status` is a string
  // ("success"/"pending"), not a boolean — presence of `data` (wrapped) or
  // `trx_id` (flat) is what actually distinguishes a real response from an
  // error one.
  const result = json.data ?? (json.trx_id && json.status ? { trx_id: json.trx_id, utr: json.utr ?? null, status: json.status } : undefined)
  if (!res.ok || !result) {
    logger.error({ status: res.status, body: rawBody }, "Payout request failed")
    const reason = !rawBody ? "empty response body" : json.message ?? "unrecognized response shape"
    throw new Error(`Payout request failed with status ${res.status}: ${reason}`)
  }

  return { gatewayTrxId: result.trx_id, utr: result.utr, status: result.status }
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
