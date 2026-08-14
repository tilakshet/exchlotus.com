/**
 * Pure date-range math — no date library (none exists anywhere in this
 * repo). Same "no explicit timezone handling" property as
 * dashboard.service.ts/reports.service.ts already has: everything runs in
 * whatever timezone the browser (here) or Postgres/Node (backend) defaults
 * to. Not a new problem introduced here.
 */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "last30"
  | "last90"
  | "custom"

export interface DateRange {
  dateFrom: Date
  dateTo: Date
}

export const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "thisWeek", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
  { value: "lastYear", label: "Last year" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
]

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Monday-start week — the common convention for business/ops reporting. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay() // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diffToMonday)
  return x
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

function startOfYear(d: Date): Date {
  const x = startOfDay(d)
  x.setMonth(0, 1)
  return x
}

/**
 * Resolves every preset except "custom" — a custom range comes directly
 * from the two date inputs in DateRangePicker, never through this function.
 */
export function getPresetRange(preset: Exclude<DateRangePreset, "custom">, now: Date = new Date()): DateRange {
  switch (preset) {
    case "today":
      return { dateFrom: startOfDay(now), dateTo: now }
    case "yesterday": {
      const y = addDays(now, -1)
      return { dateFrom: startOfDay(y), dateTo: endOfDay(y) }
    }
    case "last7":
      return { dateFrom: startOfDay(addDays(now, -6)), dateTo: now }
    case "thisWeek":
      return { dateFrom: startOfWeek(now), dateTo: now }
    case "lastWeek": {
      const thisWeekStart = startOfWeek(now)
      return { dateFrom: addDays(thisWeekStart, -7), dateTo: endOfDay(addDays(thisWeekStart, -1)) }
    }
    case "thisMonth":
      return { dateFrom: startOfMonth(now), dateTo: now }
    case "lastMonth": {
      const thisMonthStart = startOfMonth(now)
      const lastMonthEnd = endOfDay(addDays(thisMonthStart, -1))
      return { dateFrom: startOfMonth(lastMonthEnd), dateTo: lastMonthEnd }
    }
    case "thisYear":
      return { dateFrom: startOfYear(now), dateTo: now }
    case "lastYear": {
      const thisYearStart = startOfYear(now)
      const lastYearEnd = endOfDay(addDays(thisYearStart, -1))
      return { dateFrom: startOfYear(lastYearEnd), dateTo: lastYearEnd }
    }
    case "last30":
      return { dateFrom: startOfDay(addDays(now, -29)), dateTo: now }
    case "last90":
      return { dateFrom: startOfDay(addDays(now, -89)), dateTo: now }
  }
}

/** The same-length window immediately preceding `range`, for period-over-period comparison. */
export function getPreviousPeriod(range: DateRange): DateRange {
  const lengthMs = range.dateTo.getTime() - range.dateFrom.getTime()
  const dateTo = new Date(range.dateFrom.getTime() - 1)
  const dateFrom = new Date(dateTo.getTime() - lengthMs)
  return { dateFrom, dateTo }
}

export interface PeriodComparison {
  current: number
  previous: number
  changeAbs: number
  changePct: number
}

/**
 * Mirrors dashboard.service.ts's percentChange (previous=0 → 0 if current
 * is also 0, else 100 — never Infinity/NaN). Returns the raw comparison;
 * callers decide tone/label since "up is good" isn't universal (e.g. more
 * withdrawals isn't necessarily positive) — see MetricCard's `trend` prop.
 */
export function computeTrend(current: number, previous: number): PeriodComparison {
  const changeAbs = current - previous
  const changePct = previous === 0 ? (current === 0 ? 0 : 100) : (changeAbs / previous) * 100
  return { current, previous, changeAbs, changePct }
}
