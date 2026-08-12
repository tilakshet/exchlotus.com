import { CheckCircle2, Info, XCircle, X } from "lucide-react"
import { useAppSelector } from "@/store"
import { dismissToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const ICON = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
}

const TONE = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 bottom-4 z-100 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.variant]
        return (
          <div
            key={t.id}
            role="status"
            className="animate-in slide-in-from-bottom-2 fade-in-0 flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md"
          >
            <Icon className={cn("mt-0.5 size-4.5 shrink-0", TONE[t.variant])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
