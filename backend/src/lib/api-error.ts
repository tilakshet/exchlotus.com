/** Error constants from the gaming API spec §7 (all returned as HTTP 200, `{status: false}`). */
export type GamingApiErrorCode = "INVALID_USER" | "NO_BALANCE" | "DOUBLED_BET" | "NO_AMOUNT" | "INVALID_TRANSACTION"

export class GamingApiError extends Error {
  constructor(
    public readonly code: GamingApiErrorCode,
    message: string
  ) {
    super(message)
    this.name = "GamingApiError"
  }
}
