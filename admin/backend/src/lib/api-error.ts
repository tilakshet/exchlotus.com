export type AdminApiErrorCode =
  | "UNAUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "MFA_REQUIRED"
  | "MFA_INVALID"
  | "MFA_ALREADY_ENABLED"
  | "MFA_NOT_ENROLLED"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN"
  | "ADMIN_DISABLED"
  | "FORBIDDEN"
  | "EMAIL_TAKEN"
  | "NOT_FOUND"
  | "SYSTEM_ROLE_IMMUTABLE"
  | "INSUFFICIENT_BALANCE"
  | "SELF_ROLE_EDIT"
  | "DUPLICATE_ADJUSTMENT"

export class AdminApiError extends Error {
  constructor(
    public readonly code: AdminApiErrorCode,
    message: string
  ) {
    super(message)
    this.name = "AdminApiError"
  }
}

const STATUS_BY_CODE: Record<AdminApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,
  INVALID_TOKEN: 401,
  MFA_REQUIRED: 401,
  MFA_INVALID: 401,
  MFA_ALREADY_ENABLED: 409,
  MFA_NOT_ENROLLED: 422,
  INVALID_CREDENTIALS: 401,
  INVALID_REFRESH_TOKEN: 401,
  ADMIN_DISABLED: 403,
  FORBIDDEN: 403,
  EMAIL_TAKEN: 409,
  NOT_FOUND: 404,
  SYSTEM_ROLE_IMMUTABLE: 409,
  INSUFFICIENT_BALANCE: 422,
  SELF_ROLE_EDIT: 403,
  DUPLICATE_ADJUSTMENT: 409,
}

export function statusForError(err: AdminApiError): number {
  return STATUS_BY_CODE[err.code]
}
