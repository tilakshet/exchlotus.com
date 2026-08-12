import type { ReactNode } from "react"
import { X } from "lucide-react"

export interface ActiveFilter {
  key: string
  label: string
  onClear: () => void
}

export function FilterBar({
  children,
  activeFilters = [],
  onClearAll,
}: {
  children: ReactNode
  activeFilters?: ActiveFilter[]
  onClearAll?: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.onClear}
              className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {f.label}
              <X className="size-3" aria-hidden="true" />
            </button>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
