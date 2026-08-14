/**
 * Hand-rolled RFC4180 CSV writer — no csv-stringify/json2csv dependency for
 * what's a small, well-understood escaping problem (see computeRtpInPractice/
 * percentChange for the same "small pure function over a dependency"
 * precedent already in this codebase).
 */

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  return /[",\n\r]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str
}

export function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCell).join(",") + "\r\n"
}

/**
 * Streams CSV to an Express response: header row, then cursor-paginated
 * pages from `fetchPage` until it returns fewer rows than `pageSize`.
 * Keeps memory bounded to one page at a time — there's no queue system in
 * this codebase to hand large exports off to, so this is the whole
 * strategy: stream, don't buffer the full dataset.
 */
export async function streamCsv<T>(
  res: import("express").Response,
  filename: string,
  header: string[],
  fetchPage: (cursor: string | undefined, pageSize: number) => Promise<{ items: T[]; nextCursor: string | null }>,
  toRow: (item: T) => (string | number | boolean | null | undefined)[],
  pageSize = 500
): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  // BOM so Excel opens UTF-8 content (currency symbols, non-Latin usernames) correctly.
  res.write("﻿")
  res.write(csvRow(header))

  let cursor: string | undefined
  for (;;) {
    const page = await fetchPage(cursor, pageSize)
    for (const item of page.items) res.write(csvRow(toRow(item)))
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }

  res.end()
}
