import { Calendar } from "lucide-react"
import { PRESET_OPTIONS, getPresetRange, type DateRange, type DateRangePreset } from "@/lib/dateRanges"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Drives KPIs/charts/tables together from one shared range — the backend
 * never sees "preset", only resolved dateFrom/dateTo (same DateRange shape
 * reports.service.ts already takes), so every existing/new analytics
 * endpoint works with this unmodified.
 */
export function DateRangePicker({
  preset,
  value,
  onChange,
}: {
  preset: DateRangePreset
  value: DateRange
  onChange: (range: DateRange, preset: DateRangePreset) => void
}) {
  function handlePresetChange(next: string) {
    const nextPreset = next as DateRangePreset
    if (nextPreset === "custom") {
      onChange(value, "custom")
      return
    }
    onChange(getPresetRange(nextPreset), nextPreset)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-40">
          <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            className="w-36"
            value={toDateInputValue(value.dateFrom)}
            max={toDateInputValue(value.dateTo)}
            onChange={(e) => {
              if (!e.target.value) return
              const dateFrom = new Date(e.target.value)
              dateFrom.setHours(0, 0, 0, 0)
              onChange({ dateFrom, dateTo: value.dateTo }, "custom")
            }}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-36"
            value={toDateInputValue(value.dateTo)}
            min={toDateInputValue(value.dateFrom)}
            onChange={(e) => {
              if (!e.target.value) return
              const dateTo = new Date(e.target.value)
              dateTo.setHours(23, 59, 59, 999)
              onChange({ dateFrom: value.dateFrom, dateTo }, "custom")
            }}
          />
        </div>
      )}
    </div>
  )
}
