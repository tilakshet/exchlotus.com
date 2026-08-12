export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues?: unknown

  constructor(status: number, code: string, message: string, issues?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.issues = issues
  }
}
