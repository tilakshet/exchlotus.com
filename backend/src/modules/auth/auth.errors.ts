export type AuthErrorCode =
  | "EMAIL_TAKEN"
  | "PHONE_TAKEN"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN"
  | "OTP_INVALID"
  | "OTP_RATE_LIMITED"
  | "NO_PASSWORD_SET"
  | "ACCOUNT_SUSPENDED"
  | "CAPTCHA_INVALID"
  | "CAPTCHA_UNAVAILABLE"
  | "RESET_TOKEN_INVALID"

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string
  ) {
    super(message)
    this.name = "AuthError"
  }
}
