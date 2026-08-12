export interface AccessTokenPayload {
  /** Our Player.id (not the gaming-provider externalId). */
  sub: string
  externalId: string
  username: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
