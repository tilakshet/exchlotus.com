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

/** User-facing copy for the error shapes the backend is known to return (README "Error Handling"). */
export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 401:
        // Covers both "your session expired" (refresh) and "wrong
        // credentials/OTP" (login) — the backend's own message already
        // distinguishes these correctly, a blanket "session expired" here
        // would misreport a bad password/code as something else entirely.
        return err.message || "Sign-in failed — please check your details and try again."
      case 403:
        return "You don't have permission to do that."
      case 404:
        return "That couldn't be found."
      case 409:
        if (err.code === "EMAIL_TAKEN") return "That email is already registered."
        if (err.code === "PHONE_TAKEN") return "That phone number is already registered — try logging in instead."
        return "This action was already completed."
      case 422:
        if (err.code === "INSUFFICIENT_BALANCE") return "Insufficient balance."
        if (err.code === "NO_PASSWORD_SET") return err.message
        return "Please check the form for errors."
      case 429:
        return "Too many attempts — please wait a moment and try again."
      case 502:
        if (err.code === "GAME_UNAVAILABLE") return err.message
        return "Something went wrong on our end. Please try again."
      case 500:
        return "Something went wrong on our end. Please try again."
      default:
        return err.message || "Something went wrong."
    }
  }
  if (err instanceof TypeError) {
    return "Can't reach the server — check your connection and try again."
  }
  return "Something went wrong."
}
