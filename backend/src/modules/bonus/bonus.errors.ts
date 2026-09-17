export type BonusErrorCode = "WALLET_NOT_FOUND" | "INSUFFICIENT_COINS"

export class BonusError extends Error {
  constructor(
    public readonly code: BonusErrorCode,
    message: string
  ) {
    super(message)
    this.name = "BonusError"
  }
}
