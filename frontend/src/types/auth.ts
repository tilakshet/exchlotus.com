export interface AuthUser {
  username: string
  /** Null for phone/OTP accounts, which have no email at all. */
  email?: string | null
  /** Null for password/email accounts, which never collect a phone number. */
  phone?: string | null
  currency: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
