import { describe, expect, it } from "vitest"
import { ApiError, friendlyErrorMessage } from "./api-error"

describe("friendlyErrorMessage", () => {
  it.each([
    [403, undefined, /don't have permission/i],
    [404, undefined, /couldn't be found/i],
    [409, "EMAIL_TAKEN", /already registered/i],
    [409, "OTHER", /already completed/i],
    [422, "INSUFFICIENT_BALANCE", /insufficient balance/i],
    [422, "VALIDATION_ERROR", /check the form/i],
    [429, undefined, /too many attempts/i],
    [500, undefined, /went wrong on our end/i],
  ])("maps status %i (%s) to a message matching %s", (status, code, expected) => {
    const err = new ApiError(status, code ?? "UNKNOWN", "raw message")
    expect(friendlyErrorMessage(err)).toMatch(expected)
  })

  it("falls back to the raw message for an unmapped status", () => {
    const err = new ApiError(418, "TEAPOT", "I'm a teapot")
    expect(friendlyErrorMessage(err)).toBe("I'm a teapot")
  })

  it("surfaces the backend's own message for a 401 (wrong password, bad OTP, etc.)", () => {
    const err = new ApiError(401, "OTP_INVALID", "Incorrect code")
    expect(friendlyErrorMessage(err)).toBe("Incorrect code")
  })

  it("falls back to a generic sign-in message for a 401 with no message", () => {
    const err = new ApiError(401, "UNKNOWN", "")
    expect(friendlyErrorMessage(err)).toMatch(/sign-in failed/i)
  })

  it("treats a network failure (TypeError) as a connectivity message", () => {
    expect(friendlyErrorMessage(new TypeError("Failed to fetch"))).toMatch(/can't reach the server/i)
  })

  it("has a generic fallback for anything else", () => {
    expect(friendlyErrorMessage("not even an error")).toBe("Something went wrong.")
  })
})
