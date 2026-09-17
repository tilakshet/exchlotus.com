/**
 * Provider seam for transactional SMS. Only BulkSMSConnect is implemented
 * (bulksmsconnect.provider.ts), but routing every send through this
 * interface keeps a second gateway a drop-in swap — same reasoning as
 * payments' payment-gateway.interface.ts.
 */
export interface SendSmsInput {
  /** E.164, e.g. "+919876543210" — the provider adapter normalises it. */
  to: string
  /** Final message text. For OTP this must already match the DLT template. */
  message: string
}

export interface SendSmsResult {
  /** Provider-side id for the whole submission (BulkSMSConnect `msgid`). */
  providerMessageId: string
  /** Per-recipient id (BulkSMSConnect `data[0].id`), when the provider returns one. */
  recipientId?: string
}

export interface SmsProvider {
  sendSms(input: SendSmsInput): Promise<SendSmsResult>
}
