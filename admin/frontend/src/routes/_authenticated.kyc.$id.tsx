import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CreditCard, User as UserIcon, X } from "lucide-react"
import { getKycDocumentUrl, getKycSubmission, reviewKyc } from "@/api/kyc.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { ApiError } from "@/api/api-error"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge, KYC_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { ErrorState } from "@/components/shared/ErrorState"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/kyc/$id")({
  component: KycDetailPage,
})

function DocumentCard({ submissionId, type, label, icon: Icon }: { submissionId: string; type: "pan" | "photo"; label: string; icon: typeof CreditCard }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    getKycDocumentUrl(submissionId, type)
      .then((u) => {
        if (cancelled) return
        objectUrl = u
        setUrl(u)
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [submissionId, type])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {label}
      </p>
      {failed && <p className="text-sm text-destructive">Could not load this document.</p>}
      {!failed && !url && <div className="h-64 w-full animate-pulse rounded-md bg-muted" />}
      {url && <img src={url} alt={label} className="max-h-96 w-full rounded-md border border-border object-contain" />}
    </div>
  )
}

function KycDetailPage() {
  const { id } = Route.useParams()
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)

  const { data: submission, isLoading, isError, refetch } = useQuery({ queryKey: ["kyc-detail", id], queryFn: () => getKycSubmission(id) })

  const reviewMutation = useMutation({
    mutationFn: (input: { decision: "APPROVED" | "REJECTED"; reason?: string }) => reviewKyc(id, input.decision, input.reason),
    onSuccess: (result) => {
      setRejectOpen(false)
      queryClient.invalidateQueries({ queryKey: ["kyc-detail", id] })
      queryClient.invalidateQueries({ queryKey: ["kyc"] })
      toast({ title: result.status === "APPROVED" ? "KYC approved" : "KYC rejected", description: submission?.player.username, variant: "success" })
    },
    onError: (err) => toast({ title: "Action failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loading submission…" back={{ label: "Back to KYC", to: "/kyc" }} />
        <CardSkeletonGrid count={2} />
      </div>
    )
  }
  if (isError || !submission) return <ErrorState title="Unable to load this KYC submission" onRetry={() => refetch()} />

  const canManage = hasPermission("kyc.manage")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ label: "Back to KYC", to: "/kyc" }}
        title={submission.player.username}
        description={`${submission.player.phone ?? "no phone"} · PAN ${submission.panNumber} · submitted ${formatDateTime(submission.submittedAt)}`}
        actions={
          <>
            <Badge variant={submission.player.phoneVerified ? "success" : "destructive"}>
              {submission.player.phoneVerified ? "Mobile Verified" : "Mobile Not Verified"}
            </Badge>
            <StatusBadge config={KYC_STATUS_CONFIG} status={submission.status} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DocumentCard submissionId={submission.id} type="pan" label="PAN Card" icon={CreditCard} />
        <DocumentCard submissionId={submission.id} type="photo" label="Profile Photo" icon={UserIcon} />
      </div>

      {submission.status === "REJECTED" && submission.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="font-medium">Rejection reason: </span>
          {submission.rejectionReason}
        </div>
      )}

      {canManage && submission.status === "PENDING" && (
        <div className="flex gap-2">
          <Button onClick={() => reviewMutation.mutate({ decision: "APPROVED" })} disabled={reviewMutation.isPending}>
            <Check className="size-3.5" />
            {reviewMutation.isPending ? "Working…" : "Approve"}
          </Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={reviewMutation.isPending}>
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ${submission.player.username}'s KYC submission?`}
        description="They'll see this reason and can resubmit corrected documents. This is recorded in the audit log."
        confirmLabel="Reject submission"
        variant="destructive"
        requireReason
        loading={reviewMutation.isPending}
        onConfirm={(reason) => reviewMutation.mutate({ decision: "REJECTED", reason })}
      />
    </div>
  )
}
