import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Gift, Pencil, Plus, Trash2 } from "lucide-react"
import {
  createCampaign,
  deleteCampaign,
  listCampaigns,
  updateCampaign,
  type CampaignInput,
  type ReferralCampaign,
} from "@/api/referrals.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { ApiError } from "@/api/api-error"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { StatusBadge, REFERRAL_CAMPAIGN_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/referral-campaigns")({
  component: ReferralCampaignsPage,
})

const emptyForm: CampaignInput = {
  name: "",
  description: null,
  startAt: new Date().toISOString().slice(0, 10),
  endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: "DRAFT",
  qualificationRule: "REGISTRATION_ONLY",
  referrerCashReward: 0,
  referrerCoinReward: 0,
  referredCashReward: 0,
  referredCoinReward: 0,
  minDepositAmount: 0,
  minActivityAmount: 0,
  maxRewards: null,
  expiryDays: null,
}

function CampaignFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  loading,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: CampaignInput
  onSubmit: (input: CampaignInput) => void
  loading: boolean
  title: string
}) {
  const [form, setForm] = useState<CampaignInput>(initial)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm(initial)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Referrals attributed while this campaign is active snapshot these amounts — editing later never changes already-issued rewards.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Start date</label>
              <Input type="date" required value={form.startAt.slice(0, 10)} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">End date</label>
              <Input type="date" required value={form.endAt.slice(0, 10)} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CampaignInput["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="ENDED">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Qualification rule</label>
              <Select value={form.qualificationRule} onValueChange={(v) => setForm({ ...form, qualificationRule: v as CampaignInput["qualificationRule"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTRATION_ONLY">Registration only</SelectItem>
                  <SelectItem value="VERIFICATION">+ KYC verified</SelectItem>
                  <SelectItem value="DEPOSIT">+ Min deposit</SelectItem>
                  <SelectItem value="ACTIVITY">+ Min activity</SelectItem>
                  <SelectItem value="MULTIPLE">+ Deposit & activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Referrer cash (₹)</label>
              <Input type="number" min={0} value={form.referrerCashReward} onChange={(e) => setForm({ ...form, referrerCashReward: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Referrer coins</label>
              <Input type="number" min={0} value={form.referrerCoinReward} onChange={(e) => setForm({ ...form, referrerCoinReward: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Referred cash (₹)</label>
              <Input type="number" min={0} value={form.referredCashReward} onChange={(e) => setForm({ ...form, referredCashReward: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Referred coins</label>
              <Input type="number" min={0} value={form.referredCoinReward} onChange={(e) => setForm({ ...form, referredCoinReward: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min deposit (₹)</label>
              <Input type="number" min={0} value={form.minDepositAmount} onChange={(e) => setForm({ ...form, minDepositAmount: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min activity (₹)</label>
              <Input type="number" min={0} value={form.minActivityAmount} onChange={(e) => setForm({ ...form, minActivityAmount: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Max rewards (blank = unlimited)</label>
              <Input type="number" min={0} value={form.maxRewards ?? ""} onChange={(e) => setForm({ ...form, maxRewards: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Reward expiry days (blank = never)</label>
              <Input type="number" min={0} value={form.expiryDays ?? ""} onChange={(e) => setForm({ ...form, expiryDays: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ReferralCampaignsPage() {
  const { hasPermission } = useAdminAuth()
  const canManage = hasPermission("referral-campaigns.manage")
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["referral-campaigns"], queryFn: listCampaigns })

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ReferralCampaign | null>(null)
  const [deleting, setDeleting] = useState<ReferralCampaign | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["referral-campaigns"] })

  const createMutation = useMutation({
    mutationFn: (input: CampaignInput) => createCampaign(input),
    onSuccess: () => {
      setCreateOpen(false)
      invalidate()
      toast({ title: "Campaign created", variant: "success" })
    },
    onError: (err) => toast({ title: "Create failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const updateMutation = useMutation({
    mutationFn: (input: CampaignInput) => updateCampaign(editing!.id, input),
    onSuccess: () => {
      setEditing(null)
      invalidate()
      toast({ title: "Campaign updated", variant: "success" })
    },
    onError: (err) => toast({ title: "Update failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(deleting!.id),
    onSuccess: () => {
      setDeleting(null)
      invalidate()
      toast({ title: "Campaign deleted", variant: "success" })
    },
    onError: (err) => toast({ title: "Delete failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Referral Campaigns"
        description="Time-boxed reward overrides — active campaigns take priority over the global Refer & Earn settings."
        back={{ label: "Referrals", to: "/referrals" }}
        actions={
          canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New campaign
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorState title="Unable to load campaigns" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Referrer reward</TableHead>
              <TableHead>Referred reward</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={canManage ? 7 : 6} />}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="p-0">
                  <EmptyState icon={Gift} title="No campaigns yet" description="Create one to run a time-boxed referral promotion." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(campaign.startAt)} → {formatDateTime(campaign.endAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">{campaign.qualificationRule}</TableCell>
                <TableCell className="tabular-nums">
                  {formatCurrency(campaign.referrerCashReward, "INR")} + {campaign.referrerCoinReward} coins
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatCurrency(campaign.referredCashReward, "INR")} + {campaign.referredCoinReward} coins
                </TableCell>
                <TableCell>
                  <StatusBadge config={REFERRAL_CAMPAIGN_STATUS_CONFIG} status={campaign.status} />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditing(campaign)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleting(campaign)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CampaignFormDialog open={createOpen} onOpenChange={setCreateOpen} initial={emptyForm} onSubmit={(input) => createMutation.mutate(input)} loading={createMutation.isPending} title="New campaign" />

      {editing && (
        <CampaignFormDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          initial={editing}
          onSubmit={(input) => updateMutation.mutate(input)}
          loading={updateMutation.isPending}
          title="Edit campaign"
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Historical referrals attributed under this campaign keep their own snapshot data and are unaffected — only the campaign record itself is removed."
        confirmLabel="Delete campaign"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
