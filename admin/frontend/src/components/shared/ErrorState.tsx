import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ErrorState({
  title = "Unable to load this data",
  description = "Something went wrong while fetching this. Check your connection and try again.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/30 px-6 py-14 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" strokeWidth={1.5} />
      <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
