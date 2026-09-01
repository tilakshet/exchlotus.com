import { useCallback, useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDownToLine, ArrowUpFromLine, KeyRound, ScrollText, Sliders, Wallet as WalletIcon } from "lucide-react"
import { getUser } from "@/api/users.api"
import { adjustWallet, getLedger, type LedgerItem } from "@/api/wallets.api"
import { listLoginEvents } from "@/api/login-events.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge, USER_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { UserStatusAction } from "@/components/shared/UserStatusAction"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { CardSkeletonGrid, TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ApiError } from "@/api/api-error"

type LedgerTypeFilter = "ALL" | "BET" | "WIN" | "REFUND" | "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT"

/**
 * Full paginated, filterable activity for one player — the single
 * getUserDetail-embedded 25-row snapshot used to be the only view; a
 * player with more history than that had no way to see the rest. Loads
 * one page at a time (not useQuery's cache) since this is "keep
 * appending," not "refetch the same key" — reset to a fresh single page
 * whenever the type filter changes.
 */
function useLedgerActivity(playerId: string) {
  const [type, setType] = useState<LedgerTypeFilter>("ALL")
  const [items, setItems] = useState<LedgerItem[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const loadFirstPage = useCallback(
    async (activeType: LedgerTypeFilter) => {
      setLoading(true)
      setError(false)
      try {
        const page = await getLedger(playerId, { type: activeType === "ALL" ? undefined : activeType, limit: 25 })
        setItems(page.items)
        setCursor(page.nextCursor)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [playerId]
  )

  useEffect(() => {
    loadFirstPage(type)
  }, [type, loadFirstPage])

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const page = await getLedger(playerId, { type: type === "ALL" ? undefined : type, cursor, limit: 25 })
      setItems((prev) => [...(prev ?? []), ...page.items])
      setCursor(page.nextCursor)
    } catch {
      toast({ title: "Couldn't load more activity", variant: "destructive" })
    } finally {
      setLoadingMore(false)
    }
  }

  return { type, setType, items, hasMore: cursor !== null, loading, loadingMore, error, loadMore, retry: () => loadFirstPage(type) }
}

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

function AdjustBalanceForm({ id, currency, onAdjusted }: { id: string; currency: string; onAdjusted: () => void }) {
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
      onAdjusted()
      toast({ title: "Wallet adjusted", description: `${type} · ${formatCurrency(Number(amount), currency)}`, variant: "success" })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "DUPLICATE_ADJUSTMENT") {
        setAmount("")
        setReason("")
        setIdempotencyKey(crypto.randomUUID())
        queryClient.invalidateQueries({ queryKey: ["user", id] })
        onAdjusted()
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
  const ledger = useLedgerActivity(id)
  const { data: loginEvents, isLoading: loginEventsLoading } = useQuery({
    queryKey: ["login-events", id],
    queryFn: () => listLoginEvents({ playerId: id, limit: 10 }),
  })

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
            <UserStatusAction id={user.id} username={user.username} status={user.status} />
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

      {user.wallet && <AdjustBalanceForm id={user.id} currency={user.wallet.currency} onAdjusted={ledger.retry} />}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <WalletIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Activity — everything this player has done
          </p>
          <Select value={ledger.type} onValueChange={(v) => ledger.setType(v as LedgerTypeFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All activity</SelectItem>
              <SelectItem value="BET">Bets</SelectItem>
              <SelectItem value="WIN">Wins</SelectItem>
              <SelectItem value="REFUND">Refunds</SelectItem>
              <SelectItem value="DEPOSIT">Deposits</SelectItem>
              <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
              <SelectItem value="ADJUSTMENT">Admin adjustments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {ledger.error ? (
          <ErrorState title="Unable to load this player's activity" onRetry={ledger.retry} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance after</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Admin-initiated</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.loading && <TableSkeletonRows columns={6} />}
                {!ledger.loading && ledger.items?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={ScrollText}
                        title={ledger.type === "ALL" ? "No activity yet" : "No activity of this type"}
                        description={ledger.type === "ALL" ? undefined : "Try a different type filter."}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {ledger.items?.map((entry) => (
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
                    <TableCell className="text-muted-foreground">{entry.gameId === "wallet" ? "—" : entry.gameId}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.actorAdminId ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {ledger.hasMore && (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={ledger.loadMore} disabled={ledger.loadingMore}>
                  {ledger.loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
          Recent logins
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loginEventsLoading && <TableSkeletonRows columns={5} />}
            {!loginEventsLoading && loginEvents?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={KeyRound} title="No login activity yet" />
                </TableCell>
              </TableRow>
            )}
            {loginEvents?.items.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(event.createdAt)}</TableCell>
                <TableCell>{event.method === "PASSWORD" ? "Password" : event.method === "OTP" ? "OTP" : "Sign up"}</TableCell>
                <TableCell>
                  <Badge variant={event.result === "SUCCESS" ? "success" : "destructive"}>{event.result === "SUCCESS" ? "Success" : "Failure"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{event.reason ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{event.ipAddress ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
