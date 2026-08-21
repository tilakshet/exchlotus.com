export interface AccessTokenPayload {
  /** Our Player.id (not the gaming-provider externalId). */
  sub: string
  externalId: string
  username: string
  /** Player.sessionVersion at issuance — requireAuth rejects the token once this no longer matches (see schema.prisma's doc comment on that column). */
  sv: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
