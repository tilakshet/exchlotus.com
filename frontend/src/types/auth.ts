export interface AuthUser {
  username: string
  /** Null for phone/OTP accounts, unless they also registered with a password (email is optional there too). */
  email?: string | null
  phone?: string | null
  currency: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** A numeric CAPTCHA challenge — `code` is meant to be displayed on screen, not kept secret (see backend captcha.service.ts). */
export interface Captcha {
  captchaId: string
  code: string
}
