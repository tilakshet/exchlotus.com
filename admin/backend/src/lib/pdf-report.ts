import PDFDocument from "pdfkit"
import type { Response } from "express"

export interface PdfReportSection {
  heading: string
  rows: string[][]
  columnWidths?: number[]
}

/**
 * A programmatic, text/table PDF — no headless browser (puppeteer) to
 * rasterize a chart image, no rasterized chart at all. Draws rects/text
 * directly, the same restrained "draw the marks yourself" approach
 * LineChart.tsx already takes for SVG on the frontend. Sufficient for a
 * KPI-summary-plus-tables report; not intended for per-row transaction
 * dumps (those stay CSV-only, see runCsvExport).
 */
export function streamReportPdf(
  res: Response,
  filename: string,
  opts: {
    title: string
    dateFrom: Date
    dateTo: Date
    kpis: { label: string; value: string }[]
    sections: PdfReportSection[]
  }
): void {
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)

  const doc = new PDFDocument({ margin: 50, size: "A4" })
  doc.pipe(res)

  doc.fontSize(18).text("EXCHLOTUS ADMIN", { continued: false })
  doc.fontSize(14).text(opts.title)
  doc.moveDown(0.3)
  doc.fontSize(9).fillColor("#666666")
  doc.text(`Period: ${opts.dateFrom.toDateString()} — ${opts.dateTo.toDateString()}`)
  doc.text(`Generated: ${new Date().toString()}`)
  doc.fillColor("#000000")
  doc.moveDown(1)

  // KPI summary
  doc.fontSize(12).text("Summary", { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10)
  for (const kpi of opts.kpis) {
    doc.text(`${kpi.label}:  ${kpi.value}`)
  }
  doc.moveDown(1)

  for (const section of opts.sections) {
    if (doc.y > 650) doc.addPage()
    doc.fontSize(12).text(section.heading, { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(9)

    const startX = doc.x
    const colWidth = 495 / (section.rows[0]?.length ?? 1)
    for (const row of section.rows) {
      if (doc.y > 750) {
        doc.addPage()
      }
      const rowY = doc.y
      row.forEach((cell, i) => {
        doc.text(cell, startX + i * colWidth, rowY, { width: colWidth, ellipsis: true })
      })
      doc.moveDown(0.9)
    }
    doc.moveDown(1)
  }

  let pageNum = 1
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc.fontSize(8).fillColor("#999999").text(`Page ${pageNum} of ${range.count}`, 50, 800, { align: "center", width: 495 })
    pageNum++
  }

  doc.end()
}
