export type ReferralErrorCode = "CODE_GENERATION_FAILED" | "WALLET_NOT_FOUND" | "NOT_FOUND"

export class ReferralError extends Error {
  constructor(
    public readonly code: ReferralErrorCode,
    message: string
  ) {
    super(message)
    this.name = "ReferralError"
  }
}
