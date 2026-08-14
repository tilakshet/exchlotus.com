import { describe, expect, it } from "vitest"
import { computeTrend, getPresetRange, getPreviousPeriod } from "./dateRanges"

// Wednesday, August 12, 2026, 15:30 local time — a fixed reference point so
// every preset's boundaries are deterministic regardless of when tests run.
const NOW = new Date(2026, 7, 12, 15, 30, 0)

describe("getPresetRange", () => {
  it("today spans midnight to now", () => {
    const { dateFrom, dateTo } = getPresetRange("today", NOW)
    expect(dateFrom.toDateString()).toBe(NOW.toDateString())
    expect(dateFrom.getHours()).toBe(0)
    expect(dateTo).toEqual(NOW)
  })

  it("yesterday spans the full previous day", () => {
    const { dateFrom, dateTo } = getPresetRange("yesterday", NOW)
    expect(dateFrom.getDate()).toBe(11)
    expect(dateFrom.getHours()).toBe(0)
    expect(dateTo.getDate()).toBe(11)
    expect(dateTo.getHours()).toBe(23)
  })

  it("last7 covers 7 days including today", () => {
    const { dateFrom, dateTo } = getPresetRange("last7", NOW)
    expect(dateFrom.getDate()).toBe(6)
    expect(dateTo).toEqual(NOW)
  })

  it("thisWeek starts on Monday", () => {
    const { dateFrom } = getPresetRange("thisWeek", NOW)
    expect(dateFrom.getDay()).toBe(1) // Monday
    expect(dateFrom.getDate()).toBe(10) // Aug 10, 2026 is the Monday of this week
  })

  it("lastWeek is the 7 days before thisWeek, inclusive", () => {
    const { dateFrom, dateTo } = getPresetRange("lastWeek", NOW)
    expect(dateFrom.getDay()).toBe(1)
    expect(dateFrom.getDate()).toBe(3)
    expect(dateTo.getDay()).toBe(0) // Sunday
    expect(dateTo.getDate()).toBe(9)
  })

  it("thisMonth starts on the 1st", () => {
    const { dateFrom, dateTo } = getPresetRange("thisMonth", NOW)
    expect(dateFrom.getDate()).toBe(1)
    expect(dateFrom.getMonth()).toBe(7) // August
    expect(dateTo).toEqual(NOW)
  })

  it("lastMonth is the full previous calendar month", () => {
    const { dateFrom, dateTo } = getPresetRange("lastMonth", NOW)
    expect(dateFrom.getMonth()).toBe(6) // July
    expect(dateFrom.getDate()).toBe(1)
    expect(dateTo.getMonth()).toBe(6)
    expect(dateTo.getDate()).toBe(31)
  })

  it("thisYear starts January 1st", () => {
    const { dateFrom } = getPresetRange("thisYear", NOW)
    expect(dateFrom.getMonth()).toBe(0)
    expect(dateFrom.getDate()).toBe(1)
    expect(dateFrom.getFullYear()).toBe(2026)
  })

  it("lastYear is the full previous calendar year", () => {
    const { dateFrom, dateTo } = getPresetRange("lastYear", NOW)
    expect(dateFrom.getFullYear()).toBe(2025)
    expect(dateFrom.getMonth()).toBe(0)
    expect(dateFrom.getDate()).toBe(1)
    expect(dateTo.getFullYear()).toBe(2025)
    expect(dateTo.getMonth()).toBe(11)
    expect(dateTo.getDate()).toBe(31)
  })

  it("last30 and last90 span the requested day count including today", () => {
    expect(getPresetRange("last30", NOW).dateFrom.getDate()).toBe(14) // Jul 14 -> 30 days incl. today
    expect(getPresetRange("last90", NOW).dateFrom.getMonth()).toBe(4) // ~90 days back lands in May
  })
})

describe("getPreviousPeriod", () => {
  it("returns a same-length window immediately before the given range", () => {
    const range = { dateFrom: new Date(2026, 7, 8), dateTo: new Date(2026, 7, 15) }
    const previous = getPreviousPeriod(range)
    const originalLength = range.dateTo.getTime() - range.dateFrom.getTime()
    const previousLength = previous.dateTo.getTime() - previous.dateFrom.getTime()
    expect(previousLength).toBe(originalLength)
    expect(previous.dateTo.getTime()).toBe(range.dateFrom.getTime() - 1)
  })
})

describe("computeTrend", () => {
  it("computes a positive change", () => {
    const result = computeTrend(150, 100)
    expect(result.changeAbs).toBe(50)
    expect(result.changePct).toBeCloseTo(50)
  })

  it("computes a negative change", () => {
    const result = computeTrend(80, 100)
    expect(result.changePct).toBeCloseTo(-20)
  })

  it("treats a zero previous value as 0% when current is also 0, and 100% otherwise — never Infinity/NaN", () => {
    expect(computeTrend(0, 0).changePct).toBe(0)
    expect(computeTrend(50, 0).changePct).toBe(100)
    expect(computeTrend(0, 0).changePct).not.toBeNaN()
  })
})
