import { apiRequest } from "./http"
import type { AuthTokens } from "@/types/auth"

export function registerAccount(input: { username: string; email: string; password: string }): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/register", { method: "POST", body: input, anonymous: true })
}

export function login(input: { phone: string; password: string }): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/login", { method: "POST", body: input, anonymous: true })
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest<void>("/api/auth/logout", { method: "POST", body: { refreshToken }, anonymous: true })
}

/** No SMS gateway is connected — `devCode` is only present outside production, where the backend returns the generated code instead of sending it. */
export function requestOtp(phone: string): Promise<{ devCode?: string }> {
  return apiRequest<{ devCode?: string }>("/api/auth/otp/request", { method: "POST", body: { phone }, anonymous: true })
}

export function verifyOtp(input: { phone: string; code: string; referralCode?: string }): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/otp/verify", { method: "POST", body: input, anonymous: true })
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return apiRequest<void>("/api/auth/change-password", { method: "POST", body: input })
}
