import { env } from "../../../lib/env"
import { logger } from "../../../lib/logger"
import { bulkSmsConnectProvider } from "./bulksmsconnect.provider"
import { SmsError } from "./sms.errors"
import type { SmsProvider } from "./sms.provider"

const smsProvider: SmsProvider = bulkSmsConnectProvider

/**
 * DLT-approved OTP template for sender id DXPAY (entity DIGIXPRESS). Only
 * the {#num#} slot may vary — any other wording change makes Indian
 * operators drop the message even though the API returns success. Covers
 * both Sign Up phone verification and Forgot Password (both are "mobile
 * verification").
 */
function otpMessage(code: string): string {
  return `Dear user, your OTP for mobile verification is ${code}.`
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
