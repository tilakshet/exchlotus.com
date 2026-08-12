import { apiRequest } from "./http"
import type { AdminAuthTokens, AdminAuthUser, MfaChallenge } from "@/types/auth"

export function login(email: string, password: string) {
  return apiRequest<AdminAuthTokens | MfaChallenge>("/admin-api/auth/login", {
    method: "POST",
    body: { email, password },
    anonymous: true,
  })
}

export function verifyMfa(challengeToken: string, code: string) {
  return apiRequest<AdminAuthTokens>("/admin-api/auth/mfa/verify", {
    method: "POST",
    body: { challengeToken, code },
    anonymous: true,
  })
}

export function me() {
  return apiRequest<AdminAuthUser>("/admin-api/auth/me")
}

export function logout(refreshToken: string) {
  return apiRequest<void>("/admin-api/auth/logout", { method: "POST", body: { refreshToken }, anonymous: true })
}

export function beginMfaEnrollment() {
  return apiRequest<{ secret: string; otpauthUrl: string }>("/admin-api/auth/mfa/enroll", { method: "POST" })
}

export function confirmMfaEnrollment(code: string) {
  return apiRequest<void>("/admin-api/auth/mfa/enroll/confirm", { method: "POST", body: { code } })
}

export function disableMfa(password: string) {
  return apiRequest<void>("/admin-api/auth/mfa/disable", { method: "POST", body: { password } })
}
