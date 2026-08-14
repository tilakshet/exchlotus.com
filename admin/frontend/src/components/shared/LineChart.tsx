import { useId, useMemo, useState } from "react"

export interface ChartSeries {
  name: string
  colorVar: string // e.g. "var(--primary)"
  points: { x: string; y: number }[]
}

/**
 * A lean, dependency-free line chart (no charting library — this app has
 * none, and one chart page doesn't warrant adding one). Single axis, thin
 * 2px lines, a shared crosshair + tooltip on hover, legend only when there's
 * more than one series (a single series is already named by the card
 * title) — matches this repo's dataviz skill mark spec.
 */
export function LineChart({
  series,
  height = 220,
  formatValue = (v: number) => v.toLocaleString(),
  formatX = (x: string) => x,
}: {
  series: ChartSeries[]
  height?: number
  formatValue?: (v: number) => string
  formatX?: (x: string) => string
}) {
  const gradientId = useId()
  const width = 100 // viewBox units; scales responsively via preserveAspectRatio=none
  const padding = { top: 12, right: 8, bottom: 20, left: 8 }
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const labels = series[0]?.points.map((p) => p.x) ?? []
  const allValues = series.flatMap((s) => s.points.map((p) => p.y))
  const maxY = Math.max(1, ...allValues)
  const minY = Math.min(0, ...allValues)

  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const xFor = (i: number) => padding.left + (labels.length <= 1 ? plotWidth / 2 : (i / (labels.length - 1)) * plotWidth)
  const yFor = (v: number) => padding.top + plotHeight - ((v - minY) / (maxY - minY || 1)) * plotHeight

  const paths = useMemo(
    () =>
      series.map((s) => ({
        name: s.name,
        colorVar: s.colorVar,
        d: s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p.y).toFixed(2)}`).join(" "),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, minY, maxY, plotWidth, plotHeight]
  )

  if (labels.length === 0) {
    return <div className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground" style={{ height }}>No data in this range</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {series.length > 1 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: s.colorVar }} aria-hidden="true" />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-auto w-full"
          style={{ height }}
          role="img"
          aria-label={`${series.map((s) => s.name).join(" and ")} over time`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const relX = ((e.clientX - rect.left) / rect.width) * width
            const idx = Math.round(((relX - padding.left) / plotWidth) * (labels.length - 1))
            setHoverIndex(Math.min(labels.length - 1, Math.max(0, idx)))
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive gridlines: baseline + one midline */}
          <line x1={padding.left} x2={width - padding.right} y1={yFor(minY)} y2={yFor(minY)} stroke="var(--border)" strokeWidth="0.3" />
          <line x1={padding.left} x2={width - padding.right} y1={yFor((minY + maxY) / 2)} y2={yFor((minY + maxY) / 2)} stroke="var(--border)" strokeWidth="0.2" strokeDasharray="1,1" />

          {hoverIndex !== null && (
            <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={padding.top} y2={height - padding.bottom} stroke="var(--muted-foreground)" strokeWidth="0.25" />
          )}

          {paths.map((p) => (
            <path key={p.name} d={p.d} fill="none" stroke={p.colorVar} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          {hoverIndex !== null &&
            series.map((s) => (
              <circle key={s.name} cx={xFor(hoverIndex)} cy={yFor(s.points[hoverIndex].y)} r="1.4" fill={s.colorVar} stroke="var(--card)" strokeWidth="0.4" />
            ))}
        </svg>

        {hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs whitespace-nowrap text-card-foreground shadow-md"
            style={{ left: `${(xFor(hoverIndex) / width) * 100}%` }}
          >
            <p className="font-medium">{formatX(labels[hoverIndex])}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-1.5 rounded-full" style={{ background: s.colorVar }} aria-hidden="true" />
                {s.name}: <span className="tabular-nums text-foreground">{formatValue(s.points[hoverIndex].y)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
