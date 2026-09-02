import { useState } from "react"
import { ChevronDown, Download } from "lucide-react"
import { downloadFile } from "@/api/http"
import { ApiError } from "@/api/api-error"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ExportModule = "users" | "ledger" | "games" | "reports" | "referrals" | "withdrawals" | "kyc" | "payments" | "bank-accounts" | "game-launch-failures"
type ExportFormat = "csv" | "pdf"

/**
 * Renders only if the admin holds `<module>.export` — same hasPermission
 * gate used everywhere else, and the backend enforces the same permission
 * independently (see requirePermission("<module>.export") on each export
 * route), so hiding this button is a UX nicety, not the security boundary.
 */
export function ExportButton({
  module,
  filters,
  formats = ["csv"],
}: {
  module: ExportModule
  filters: Record<string, string | number | boolean | undefined>
  formats?: ExportFormat[]
}) {
  const { hasPermission } = useAdminAuth()
  const [pending, setPending] = useState<ExportFormat | null>(null)

  if (!hasPermission(`${module}.export`)) return null

  async function handleExport(format: ExportFormat) {
    setPending(format)
    try {
      const query: Record<string, string | number | undefined> = { format }
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined) continue
        query[key] = typeof value === "boolean" ? String(value) : value
      }
      await downloadFile(`/admin-api/${module}/export`, query)
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setPending(null)
    }
  }

  const label = pending ? "Preparing export…" : "Export"

  if (formats.length === 1) {
    return (
      <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => handleExport(formats[0])}>
        <Download className="size-3.5" />
        {label}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending !== null}>
          <Download className="size-3.5" />
          {label}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem key={format} onSelect={() => handleExport(format)}>
            {format.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
