import { apiRequest } from "./http"
import type { AuthTokens, Captcha } from "@/types/auth"
import type { Gender } from "@/types/profile"

interface CaptchaFields {
  captchaId: string
  captchaCode: string
}

/** Numeric CAPTCHA — server-generated and validated (see backend captcha.service.ts). Shared by register/login/forgot-password/reset-password. */
export function getCaptcha(): Promise<Captcha> {
  return apiRequest<Captcha>("/api/auth/captcha", { method: "POST", anonymous: true })
}

export function registerAccount(input: {
  username: string
  phone: string
  email?: string
  password: string
  gender: Gender
  /** Another player's referralCode — validated server-side, see auth.service.ts register(). */
  referralCode?: string
} & CaptchaFields): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/register", { method: "POST", body: input, anonymous: true })
}

export function login(input: { phone: string; password: string } & CaptchaFields): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/login", { method: "POST", body: input, anonymous: true })
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest<void>("/api/auth/logout", { method: "POST", body: { refreshToken }, anonymous: true })
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return apiRequest<void>("/api/auth/change-password", { method: "POST", body: input })
}

/** Step 1 of Forgot Password — identifier is a phone or email. No OTP is sent; the returned resetToken authorizes the next step directly. */
export function forgotPassword(input: { identifier: string } & CaptchaFields): Promise<{ resetToken: string }> {
  return apiRequest<{ resetToken: string }>("/api/auth/forgot-password", { method: "POST", body: input, anonymous: true })
}

/** Step 2 of Forgot Password. */
export function resetPassword(input: { resetToken: string; newPassword: string } & CaptchaFields): Promise<void> {
  return apiRequest<void>("/api/auth/reset-password", { method: "POST", body: input, anonymous: true })
}
