import { apiRequest } from "./http"
import type { AuthTokens } from "@/types/auth"
import type { Gender } from "@/types/profile"

/** In non-production the backend returns the code as `devCode` (SMS_ENABLED=false); production sends it by SMS and returns `{}`. */
type OtpRequestResult = { devCode?: string }

/** Sign Up: send a phone-verification OTP. Rejects with PHONE_TAKEN if the number already has an account. */
export function sendSignupOtp(phone: string): Promise<OtpRequestResult> {
  return apiRequest<OtpRequestResult>("/api/auth/register/send-otp", { method: "POST", body: { phone }, anonymous: true })
}

/** Sign Up: confirm the OTP. On success the backend will accept a register() call for this phone for ~20 min. */
export function verifySignupOtp(input: { phone: string; code: string }): Promise<{ verified: true }> {
  return apiRequest<{ verified: true }>("/api/auth/register/verify-otp", { method: "POST", body: input, anonymous: true })
}

/** Forgot Password step 1: send an OTP to the account's phone. Enumeration-safe — same response for an unknown number. */
export function sendPasswordResetOtp(phone: string): Promise<OtpRequestResult> {
  return apiRequest<OtpRequestResult>("/api/auth/forgot-password/send-otp", { method: "POST", body: { phone }, anonymous: true })
}

/** Forgot Password step 2: confirm the OTP, receive the single-use resetToken for resetPassword(). */
export function verifyPasswordResetOtp(input: { phone: string; code: string }): Promise<{ resetToken: string }> {
  return apiRequest<{ resetToken: string }>("/api/auth/forgot-password/verify-otp", { method: "POST", body: input, anonymous: true })
}

export function registerAccount(input: {
  username: string
  phone: string
  email?: string
  password: string
  gender: Gender
  /** Another player's referralCode — validated server-side, see auth.service.ts register(). */
  referralCode?: string
}): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/register", { method: "POST", body: input, anonymous: true })
}

export function login(input: { phone: string; password: string }): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/login", { method: "POST", body: input, anonymous: true })
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest<void>("/api/auth/logout", { method: "POST", body: { refreshToken }, anonymous: true })
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return apiRequest<void>("/api/auth/change-password", { method: "POST", body: input })
}

/** Final step of Forgot Password — authorized by the resetToken from verifyPasswordResetOtp (the phone OTP is the gate now; no CAPTCHA here). */
export function resetPassword(input: { resetToken: string; newPassword: string }): Promise<void> {
  return apiRequest<void>("/api/auth/reset-password", { method: "POST", body: input, anonymous: true })
}
