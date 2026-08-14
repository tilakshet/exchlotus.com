import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDownToLine, ArrowUpFromLine, Ban, CheckCircle2, ScrollText, Sliders, Wallet as WalletIcon } from "lucide-react"
import { activateUser, getUser, suspendUser } from "@/api/users.api"
import { adjustWallet, getLedger } from "@/api/wallets.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge, USER_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { CardSkeletonGrid, TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ApiError } from "@/api/api-error"

export const Route = createFileRoute("/_authenticated/users/$id")({
  component: UserDetailPage,
})

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tracking-tight">{value}</span>
    </div>
  )
}

function StatusAction({ id, username, status }: { id: string; username: string; status: "ACTIVE" | "SUSPENDED" }) {
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

function AdjustBalanceForm({ id, currency }: { id: string; currency: string }) {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT">("ADJUSTMENT")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  // One key per submission intent: reused across a pending call and any
  // accidental retry of it, regenerated only once that intent resolves
  // (success or a confirmed duplicate) so the next submit is a fresh one.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  const mutation = useMutation({
    mutationFn: () => adjustWallet(id, { type, amount: Number(amount), reason, idempotencyKey }),
    onSuccess: () => {
      setAmount("")
      setReason("")
      setIdempotencyKey(crypto.randomUUID())
      queryClient.invalidateQueries({ queryKey: ["user", id] })
      queryClient.invalidateQueries({ queryKey: ["ledger", id] })
      toast({ title: "Wallet adjusted", description: `${type} · ${formatCurrency(Number(amount), currency)}`, variant: "success" })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "DUPLICATE_ADJUSTMENT") {
        setAmount("")
        setReason("")
        setIdempotencyKey(crypto.randomUUID())
        queryClient.invalidateQueries({ queryKey: ["user", id] })
        queryClient.invalidateQueries({ queryKey: ["ledger", id] })
        toast({ title: "Already applied", description: "This adjustment was already submitted — no changes were duplicated.", variant: "success" })
        return
      }
      toast({ title: "Adjustment failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" })
    },
  })

  if (!hasPermission("wallets.adjust")) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sliders className="size-4 text-muted-foreground" aria-hidden="true" />
        Manual wallet adjustment
      </p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADJUSTMENT">Adjustment (+)</SelectItem>
              <SelectItem value="DEPOSIT">Deposit (+)</SelectItem>
              <SelectItem value="WITHDRAWAL">Withdrawal (−)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Amount ({currency})</label>
          <Input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-36" />
        </div>
        <div className="flex flex-1 min-w-48 flex-col gap-1">
          <label className="text-xs text-muted-foreground">Reason</label>
          <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required — recorded in the audit log" />
        </div>
        <Button type="submit" disabled={mutation.isPending || reason.trim().length < 3}>
          {mutation.isPending ? "Applying…" : "Apply"}
        </Button>
      </form>
    </div>
  )
}

function UserDetailPage() {
  const { id } = Route.useParams()
  const { data: user, isLoading, isError, refetch } = useQuery({ queryKey: ["user", id], queryFn: () => getUser(id) })
  const { data: ledger, isLoading: ledgerLoading } = useQuery({ queryKey: ["ledger", id], queryFn: () => getLedger(id, { limit: 25 }) })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loading user…" back={{ label: "Back to Users", to: "/users" }} />
        <CardSkeletonGrid count={3} />
      </div>
    )
  }
  if (isError || !user) return <ErrorState title="Unable to load this user" onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ label: "Back to Users", to: "/users" }}
        title={user.username}
        description={`${user.email ?? "no email"} · ${user.phone ?? "no phone"} · joined ${formatDateTime(user.createdAt)}`}
        actions={
          <>
            <StatusBadge config={USER_STATUS_CONFIG} status={user.status} />
            <StatusAction id={user.id} username={user.username} status={user.status} />
          </>
        }
      />

      {user.wallet && (
        <section className="grid grid-cols-3 gap-3">
          <StatCard label="Balance" value={formatCurrency(user.wallet.balance, user.wallet.currency)} />
          <StatCard label="Bonus balance" value={formatCurrency(user.wallet.bonusBalance, user.wallet.currency)} />
          <StatCard label="Locked balance" value={formatCurrency(user.wallet.lockedBalance, user.wallet.currency)} />
        </section>
      )}

      {user.wallet && <AdjustBalanceForm id={user.id} currency={user.wallet.currency} />}

      <section>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <WalletIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          Ledger
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance after</TableHead>
              <TableHead>Admin-initiated</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgerLoading && <TableSkeletonRows columns={5} />}
            {!ledgerLoading && ledger?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={ScrollText} title="No ledger activity yet" />
                </TableCell>
              </TableRow>
            )}
            {ledger?.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    {entry.amount < 0 ? (
                      <ArrowUpFromLine className="size-3.5 text-destructive" aria-hidden="true" />
                    ) : (
                      <ArrowDownToLine className="size-3.5 text-success" aria-hidden="true" />
                    )}
                    {entry.type}
                  </span>
                </TableCell>
                <TableCell className={entry.amount < 0 ? "text-destructive tabular-nums" : "text-success tabular-nums"}>
                  {formatCurrency(entry.amount, user.currency)}
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(entry.balanceAfter, user.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{entry.actorAdminId ? "Yes" : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
