import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import { bulkSmsConnectProvider } from "./bulksmsconnect.provider"
import { SmsError } from "./sms.errors"
import type { SmsProvider } from "./sms.provider"

const smsProvider: SmsProvider = bulkSmsConnectProvider

/**
 * DLT-approved OTP template (template id 1777178945567804655), verbatim:
 *   "Dear Customer, your OTP for mobile verification is {#num#}. SSPS CLDNEX"
 * Only the {#num#} slot may vary — ANY other change (wording, casing,
 * dropping "SSPS CLDNEX", punctuation) makes the operator scrub the SMS even
 * though the gateway returns status:"OK". Covers both Sign Up phone
 * verification and Forgot Password. Replaces the earlier template (id
 * 1777178858477106346, "Dear user, ... Team DIGIXPRESS") — 2026-09-15.
 */
function otpMessage(code: string): string {
  return `Dear Customer, your OTP for mobile verification is ${code}. SSPS CLDNEX`
}

/**
 * Sends the OTP SMS, or no-ops in dev. Throws {@link SmsError} on any real
 * delivery failure — auth.service.ts's requestOtp catches that and (a) does
 * NOT persist the OtpCode row, so the resend cooldown isn't tripped by a
 * send that never arrived, and (b) surfaces a clean 503 to the caller.
 *
 * When SMS_ENABLED is false (local/dev) nothing is sent — requestOtp still
 * returns the code as `devCode`, so the flow is fully testable offline.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (!env.SMS_ENABLED) {
    logger.info({ phone }, "SMS disabled (SMS_ENABLED=false) — skipping OTP send, code returned as devCode")
    return
  }

  const result = await smsProvider.sendSms({ to: phone, message: otpMessage(code) })
  logger.info({ phone, providerMessageId: result.providerMessageId }, "OTP SMS submitted to provider")
}

export { SmsError }
