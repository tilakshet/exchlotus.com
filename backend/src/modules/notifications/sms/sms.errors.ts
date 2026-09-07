/**
 * A failure to hand an SMS to the provider. `code` is what callers branch
 * on (auth.service.ts maps every one of these to a single user-facing
 * "couldn't send the code, try again" — the distinction is for logs/alerts):
 *
 * - NOT_CONFIGURED      SMS_API_KEY / SMS_SENDER_ID missing while SMS_ENABLED is true
 * - INVALID_RECIPIENT   the phone number isn't a deliverable +91 mobile
 * - INSUFFICIENT_CREDIT  provider rejected for no balance (AZQ10) — alert-worthy
 * - REJECTED            provider rejected for any other reason (bad key/sender/route/template)
 * - UNAVAILABLE         network error, timeout, or non-2xx from the provider
 */
export class SmsError extends Error {
  constructor(
    public readonly code:
      | "NOT_CONFIGURED"
      | "INVALID_RECIPIENT"
      | "INSUFFICIENT_CREDIT"
      | "REJECTED"
      | "UNAVAILABLE",
    message: string
  ) {
    super(message)
    this.name = "SmsError"
  }
}
