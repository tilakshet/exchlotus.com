import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Check, RotateCcw, ShieldQuestion, X } from "lucide-react"
import { approveReferral, getReferral, rejectReferral, reverseReferralReward, reviewReferralRisk, type ReferralRiskStatus } from "@/api/referrals.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { ApiError } from "@/api/api-error"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge, REFERRAL_RISK_STATUS_CONFIG, REFERRAL_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ErrorState } from "@/components/shared/ErrorState"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/referrals/$id")({
  component: ReferralDetailPage,
})

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tracking-tight">{value}</span>
    </div>
  )
}

function ReferralActions({ id, status, riskStatus }: { id: string; status: string; riskStatus: ReferralRiskStatus }) {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["referral", id] })
    queryClient.invalidateQueries({ queryKey: ["referrals"] })
  }

  const approveMutation = useMutation({
    mutationFn: () => approveReferral(id),
    onSuccess: () => {
      invalidate()
      toast({ title: "Referral approved", description: "Reward issued (or already had been).", variant: "success" })
    },
    onError: (err) => toast({ title: "Approval failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectReferral(id, reason),
    onSuccess: () => {
      setRejectOpen(false)
      invalidate()
      toast({ title: "Referral rejected", variant: "success" })
    },
    onError: (err) => toast({ title: "Rejection failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const reverseMutation = useMutation({
    mutationFn: (reason: string) => reverseReferralReward(id, reason),
    onSuccess: (result) => {
      setReverseOpen(false)
      invalidate()
      toast({ title: "Reward reversed", description: `${result.reversedCount} movement(s) reversed.`, variant: "success" })
    },
    onError: (err) => toast({ title: "Reversal failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const reviewMutation = useMutation({
    mutationFn: (next: ReferralRiskStatus) => reviewReferralRisk(id, next),
    onSuccess: () => {
      invalidate()
      toast({ title: "Risk status updated", variant: "success" })
    },
    onError: (err) => toast({ title: "Update failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (!hasPermission("referrals.manage")) return null

  const anyPending = approveMutation.isPending || rejectMutation.isPending || reverseMutation.isPending || reviewMutation.isPending

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "REJECTED" && status !== "CANCELLED" && (
        <Button size="sm" onClick={() => approveMutation.mutate()} disabled={anyPending}>
          <Check className="size-3.5" />
          {approveMutation.isPending ? "Approving…" : "Approve & reward"}
        </Button>
      )}
      {status !== "REWARDED" && status !== "REJECTED" && status !== "CANCELLED" && (
        <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={anyPending}>
          <X className="size-3.5" />
          Reject
        </Button>
      )}
      {status === "REWARDED" && (
        <Button size="sm" variant="destructive" onClick={() => setReverseOpen(true)} disabled={anyPending}>
          <RotateCcw className="size-3.5" />
          Reverse reward
        </Button>
      )}
      {riskStatus !== "BLOCKED" && (
        <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate("BLOCKED")} disabled={anyPending}>
          <ShieldQuestion className="size-3.5" />
          Block
        </Button>
      )}
      {riskStatus !== "NORMAL" && (
        <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate("NORMAL")} disabled={anyPending}>
          <Check className="size-3.5" />
          Mark reviewed
        </Button>
      )}

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this referral?"
        description="No reward will be issued for it."
        confirmLabel="Reject referral"
        variant="destructive"
        requireReason
        loading={rejectMutation.isPending}
        onConfirm={(reason) => rejectMutation.mutate(reason!)}
      />
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Reverse this reward?"
        description="Debits back every completed cash/coin movement for this referral. This is recorded in the audit log and cannot be undone by re-approving."
        confirmLabel="Reverse reward"
        variant="destructive"
        requireReason
        loading={reverseMutation.isPending}
        onConfirm={(reason) => reverseMutation.mutate(reason!)}
      />
    </div>
  )
}

function ReferralDetailPage() {
  const { id } = Route.useParams()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["referral", id], queryFn: () => getReferral(id) })

  if (isError) return <ErrorState title="Unable to load this referral" onRetry={() => refetch()} />
  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${data.referrer.username} → ${data.referred.username}`}
        description={`Referral code ${data.referralCode}`}
        back={{ label: "Referrals", to: "/referrals" }}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge config={REFERRAL_STATUS_CONFIG} status={data.status} />
            <StatusBadge config={REFERRAL_RISK_STATUS_CONFIG} status={data.riskStatus} />
          </div>
        }
      />

      <ReferralActions id={id} status={data.status} riskStatus={data.riskStatus} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Registered" value={formatDateTime(data.registeredAt)} />
        <StatCard label="Qualified" value={data.qualifiedAt ? formatDateTime(data.qualifiedAt) : "—"} />
        <StatCard label="Rewarded" value={data.rewardedAt ? formatDateTime(data.rewardedAt) : "—"} />
        <StatCard label="Risk score" value={String(data.riskScore)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Referrer</span>
          <span className="font-medium">{data.referrer.username}</span>
          <span className="text-sm text-muted-foreground">{data.referrer.phone ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Referred user</span>
          <span className="font-medium">{data.referred.username}</span>
          <span className="text-sm text-muted-foreground">{data.referred.phone ?? "—"}</span>
        </div>
      </div>

      {data.campaign && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <span className="font-medium">Campaign:</span> {data.campaign.name} — {formatCurrency(data.campaign.referrerCashReward, "INR")} referrer /{" "}
          {formatCurrency(data.campaign.referredCashReward, "INR")} referred, rule {data.campaign.qualificationRule}
        </div>
      )}

      {data.riskFlags.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Risk flags
          </span>
          {data.riskFlags.map((flag) => (
            <div key={flag.id} className="text-sm">
              <span className="font-medium">{flag.type}</span> — {flag.detail ?? "no detail"} · {formatDateTime(flag.createdAt)}
            </div>
          ))}
        </div>
      )}

      {data.adminNote && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <span className="font-medium">Admin note:</span> {data.adminNote}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Reward ledger</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rewards.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No reward movements yet
                </TableCell>
              </TableRow>
            )}
            {data.rewards.map((reward) => (
              <TableRow key={reward.id}>
                <TableCell>{reward.type}</TableCell>
                <TableCell className="tabular-nums">{reward.currency === "COIN" ? `${reward.amount} coins` : formatCurrency(reward.amount, "INR")}</TableCell>
                <TableCell>{reward.status}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{reward.reference}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(reward.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
