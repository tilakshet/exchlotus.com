import { authenticator } from "otplib"
import { env } from "../../lib/env"

export function generateMfaSecret(): string {
  return authenticator.generateSecret()
}

export function mfaKeyUri(email: string, secret: string): string {
  return authenticator.keyuri(email, env.MFA_ISSUER, secret)
}

export function verifyMfaCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret })
  } catch {
    return false
  }
}
