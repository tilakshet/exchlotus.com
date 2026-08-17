import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Ban, CheckCircle2 } from "lucide-react"
import { activateUser, suspendUser } from "@/api/users.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ApiError } from "@/api/api-error"

/**
 * Suspend/reactivate a player — originally local to the Users detail page,
 * extracted so the Support ticket detail view can offer the same action in
 * place (an admin handling a ticket shouldn't have to navigate away to act
 * on the account it's about). Both call sites invalidate their own query
 * keys via `extraInvalidateKeys` on top of the ["user", id] this always
 * refreshes.
 */
export function UserStatusAction({
  id,
  username,
  status,
  extraInvalidateKeys = [],
}: {
  id: string
  username: string
  status: "ACTIVE" | "SUSPENDED"
  extraInvalidateKeys?: readonly (readonly unknown[])[]
}) {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const nextStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"

  const mutation = useMutation({
    mutationFn: (reason?: string) => (status === "ACTIVE" ? suspendUser(id, reason!) : activateUser(id, reason!)),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["user", id] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      for (const key of extraInvalidateKeys) queryClient.invalidateQueries({ queryKey: key })
      toast({
        title: nextStatus === "SUSPENDED" ? "User suspended" : "User reactivated",
        description: username,
        variant: "success",
      })
    },
    onError: (err) => toast({ title: "Action failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (!hasPermission("users.suspend")) return null

  return (
    <>
      <Button variant={status === "ACTIVE" ? "destructive" : "default"} size="sm" onClick={() => setOpen(true)}>
        {status === "ACTIVE" ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
        {status === "ACTIVE" ? "Suspend" : "Reactivate"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={status === "ACTIVE" ? `Suspend ${username}?` : `Reactivate ${username}?`}
        description={
          status === "ACTIVE"
            ? "The player will be immediately blocked from logging in and playing. This is recorded in the audit log."
            : "The player regains full access immediately. This is recorded in the audit log."
        }
        confirmLabel={status === "ACTIVE" ? "Suspend user" : "Reactivate user"}
        variant={status === "ACTIVE" ? "destructive" : "default"}
        requireReason
        loading={mutation.isPending}
        onConfirm={(reason) => mutation.mutate(reason)}
      />
    </>
  )
}
