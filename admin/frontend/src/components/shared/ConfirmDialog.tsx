import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Every destructive/state-changing admin action routes through this — one
 * place enforcing master spec §19/§36's "confirmation + reason" pattern,
 * instead of each page inventing its own inline reveal-a-textbox flow.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  requireReason = false,
  loading = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  variant?: "default" | "destructive"
  requireReason?: boolean
  loading?: boolean
  onConfirm: (reason?: string) => void
}) {
  const [reason, setReason] = useState("")
  const reasonInvalid = requireReason && reason.trim().length < 3

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason("")
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {requireReason && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-reason" className="text-xs font-medium text-muted-foreground">
              Reason
            </label>
            <Input
              id="confirm-reason"
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required — recorded in the audit log"
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={reasonInvalid || loading}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
