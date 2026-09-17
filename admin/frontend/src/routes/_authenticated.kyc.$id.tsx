import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { getKycSubmission } from "@/api/kyc.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge, KYC_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { ErrorState } from "@/components/shared/ErrorState"
import { formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/kyc/$id")({
  component: KycDetailPage,
})

function KycDetailPage() {
  const { id } = Route.useParams()

  const { data: submission, isLoading, isError, refetch } = useQuery({ queryKey: ["kyc-detail", id], queryFn: () => getKycSubmission(id) })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loading submission…" back={{ label: "Back to KYC", to: "/kyc" }} />
        <CardSkeletonGrid count={2} />
      </div>
    )
  }
  if (isError || !submission) return <ErrorState title="Unable to load this KYC submission" onRetry={() => refetch()} />

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

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Verification source:</span> {submission.verificationSource === "QRX_PAN_API" ? "QRX PAN API" : "Manual"}</p>
        <p><span className="text-muted-foreground">PAN type:</span> {submission.panType ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Full name:</span> {submission.fullName ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">First name:</span> {submission.firstName ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Middle name:</span> {submission.middleName ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Last name:</span> {submission.lastName ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Gender:</span> {submission.gender ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Date of birth:</span> {submission.dateOfBirth ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Aadhaar linked:</span> {submission.aadhaarLinked === null ? "Not provided" : submission.aadhaarLinked ? "Yes" : "No"}</p>
        <p><span className="text-muted-foreground">Aadhaar:</span> {submission.aadhaarNumber ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Mobile:</span> {submission.mobile ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Email:</span> {submission.email ?? "Not provided"}</p>
        <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {[submission.buildingName, submission.locality, submission.streetName, submission.city, submission.state, submission.pincode, submission.country].filter(Boolean).join(", ") || "Not provided"}</p>
        <p><span className="text-muted-foreground">Provider:</span> {submission.provider ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Request ID:</span> {submission.providerRequestId ?? "Not provided"}</p>
        <p><span className="text-muted-foreground">Verified at:</span> {submission.verifiedAt ? formatDateTime(submission.verifiedAt) : "Not verified"}</p>
      </section>

      {submission.status === "REJECTED" && submission.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="font-medium">Rejection reason: </span>
          {submission.rejectionReason}
        </div>
      )}
    </div>
  )
}
