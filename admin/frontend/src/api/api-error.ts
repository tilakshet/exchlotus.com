export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues?: unknown
  readonly retryAfterSeconds?: number

  constructor(status: number, code: string, message: string, issues?: unknown, retryAfterSeconds?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.issues = issues
    this.retryAfterSeconds = retryAfterSeconds
  }
}
