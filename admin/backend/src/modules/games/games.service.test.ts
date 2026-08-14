import { describe, expect, it } from "vitest"
import { computeRtpInPractice } from "./games.service"

describe("computeRtpInPractice", () => {
  it("returns the win/bet ratio as a percentage", () => {
    expect(computeRtpInPractice(1000, 950)).toBeCloseTo(95)
  })

  it("returns null instead of dividing by zero when there's no bet volume", () => {
    expect(computeRtpInPractice(0, 0)).toBeNull()
    expect(computeRtpInPractice(0, 100)).toBeNull()
  })

  it("is not NaN or Infinity for any non-negative input", () => {
    const result = computeRtpInPractice(0, 500)
    expect(result).not.toBeNaN()
    expect(result).toBeNull()
  })
})
