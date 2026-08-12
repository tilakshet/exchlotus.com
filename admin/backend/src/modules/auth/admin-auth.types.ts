export interface AdminAccessTokenPayload {
  sub: string
  sessionId: string
  email: string
}

export interface MfaChallengeTokenPayload {
  sub: string
  purpose: "mfa_challenge"
}

export interface AdminAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** Attached to `req` by requireAdminAuth — the resolved, current-as-of-this-request identity. */
export interface AdminAuthContext {
  id: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  roleName: string
  permissions: string[]
  sessionId: string
}
