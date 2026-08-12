export interface AdminAuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  roleName: string
  permissions: string[]
  sessionId: string
}

export interface AdminAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface MfaChallenge {
  mfaRequired: true
  challengeToken: string
}
