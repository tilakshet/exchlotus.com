import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import { SmsError } from "./sms.errors"
import type { SendSmsInput, SendSmsResult, SmsProvider } from "./sms.provider"

// Confirmed live against the account (test send returned `status: "OK"`):
//   POST https://bulksmsconnect.in/V2/http-api-post.php
//   body: { apikey, senderid, number, message, format: "json" }   <- nothing else
//   number: "91XXXXXXXXXX"  (country code, NO "+")
//   success: { status: "OK", data: [{ id, mobile, status: "SUBMITTED" }], msgid, message }
//   failure: { status: "AZQ..", message } — HTTP 200, error is in `status`
// The template auto-matches by sender id + message text, so no template_id
// / entity_id parameters are needed.
const SEND_PATH = "/http-api-post.php"

interface BulkSmsResponse {
  status?: string
  message?: string
  msgid?: string | number
  data?: Array<{ id?: string | number; mobile?: string; status?: string }>
}

/** "+919876543210" -> "919876543210"; rejects anything that isn't a +91 mobile. */
function toProviderNumber(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "")
  if (!/^91\d{10}$/.test(digits)) {
    throw new SmsError("INVALID_RECIPIENT", `Not a deliverable Indian mobile number: ${e164}`)
  }
  return digits
}

class BulkSmsConnectProvider implements SmsProvider {
  async sendSms({ to, message }: SendSmsInput): Promise<SendSmsResult> {
    if (!env.SMS_API_KEY || !env.SMS_SENDER_ID) {
      throw new SmsError("NOT_CONFIGURED", "SMS_API_KEY / SMS_SENDER_ID are not set")
    }

    const number = toProviderNumber(to)

    let response: Response
    try {
      response = await fetch(`${env.SMS_API_BASE_URL}${SEND_PATH}`, {
        method: "POST",
        signal: AbortSignal.timeout(env.SMS_TIMEOUT_MS),
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          apikey: env.SMS_API_KEY,
          senderid: env.SMS_SENDER_ID,
          number,
          message,
          format: "json",
        }),
      })
    } catch {
      throw new SmsError("UNAVAILABLE", "SMS provider is unreachable or timed out")
    }

    const body = (await response.json().catch(() => ({}))) as BulkSmsResponse

    if (!response.ok) {
      logger.error({ status: response.status, providerStatus: body.status }, "SMS provider returned non-2xx")
      throw new SmsError("UNAVAILABLE", `SMS provider responded with HTTP ${response.status}`)
    }

    if (body.status !== "OK") {
      const providerStatus = body.status ?? "UNKNOWN"
      const providerMessage = body.message ?? "no message"
      // AZQ10 = "You have insufficient credit" — a production outage worth
      // paging on, distinct from a config/template rejection.
      const noCredit = providerStatus === "AZQ10" || /insufficient credit/i.test(providerMessage)
      logger.error({ providerStatus, providerMessage }, "SMS provider rejected the send")
      throw new SmsError(
        noCredit ? "INSUFFICIENT_CREDIT" : "REJECTED",
        `SMS provider rejected the send (${providerStatus}: ${providerMessage})`
      )
    }

    return {
      providerMessageId: body.msgid != null ? String(body.msgid) : "",
      recipientId: body.data?.[0]?.id != null ? String(body.data[0].id) : undefined,
    }
  }
}

export const bulkSmsConnectProvider: SmsProvider = new BulkSmsConnectProvider()
