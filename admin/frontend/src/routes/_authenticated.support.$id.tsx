import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDownToLine, ArrowUpFromLine, Landmark, Send, User as UserIcon, Wallet as WalletIcon } from "lucide-react"
import { getTicket, replyToTicket, setTicketStatus, type SupportTicketStatus } from "@/api/support.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { ApiError } from "@/api/api-error"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge, TICKET_STATUS_CONFIG, LEDGER_TYPE_CONFIG, USER_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { UserStatusAction } from "@/components/shared/UserStatusAction"
import { ErrorState } from "@/components/shared/ErrorState"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/support/$id")({
  component: TicketDetailPage,
})

const STATUS_OPTIONS: SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]

function PlayerContextCard({ ticketId, player, recentActivity }: {
  ticketId: string
  player: { id: string; username: string; externalId: string; status: "ACTIVE" | "SUSPENDED"; balance: number | null; currency: string | null }
  recentActivity: {
    ledger: { id: string; type: string; amount: number; createdAt: string }[]
    latestWithdrawal: { id: string; status: string; amount: number; requestedAt: string } | null
    latestPaymentOrder: { id: string; status: string; amount: number; createdAt: string } | null
  }
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <Link to="/users/$id" params={{ id: player.id }} className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            {player.username}
          </Link>
          <StatusBadge config={USER_STATUS_CONFIG} status={player.status} />
        </div>
        <UserStatusAction id={player.id} username={player.username} status={player.status} extraInvalidateKeys={[["support-ticket", ticketId]]} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <WalletIcon className="size-3" aria-hidden="true" />
            Balance
          </span>
          <span className="text-sm font-medium tabular-nums">{player.balance !== null ? formatCurrency(player.balance, player.currency ?? "INR") : "—"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpFromLine className="size-3" aria-hidden="true" />
            Latest withdrawal
          </span>
          <span className="text-sm font-medium">
            {recentActivity.latestWithdrawal ? `${recentActivity.latestWithdrawal.status} · ${formatCurrency(recentActivity.latestWithdrawal.amount, player.currency ?? "INR")}` : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownToLine className="size-3" aria-hidden="true" />
            Latest deposit
          </span>
          <span className="text-sm font-medium">
            {recentActivity.latestPaymentOrder ? `${recentActivity.latestPaymentOrder.status} · ${formatCurrency(recentActivity.latestPaymentOrder.amount, player.currency ?? "INR")}` : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Landmark className="size-3" aria-hidden="true" />
            Player ID
          </span>
          <span className="font-mono text-xs text-muted-foreground" title={player.id}>
            {player.externalId}
          </span>
        </div>
      </div>

      {recentActivity.ledger.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent ledger activity</p>
          <ul className="flex flex-col gap-1">
            {recentActivity.ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <StatusBadge config={LEDGER_TYPE_CONFIG} status={entry.type} />
                </span>
                <span className="tabular-nums text-muted-foreground">{formatCurrency(entry.amount, player.currency ?? "INR")}</span>
                <span className="text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TicketDetailPage() {
  const { id } = Route.useParams()
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")

  const { data: ticket, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => getTicket(id),
  })

  const replyMutation = useMutation({
    mutationFn: (body: string) => replyToTicket(id, body),
    onSuccess: () => {
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["support-ticket", id] })
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
    },
    onError: (err) => toast({ title: "Reply failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: SupportTicketStatus) => setTicketStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", id] })
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
      toast({ title: "Status updated", variant: "success" })
    },
    onError: (err) => toast({ title: "Status update failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loading ticket…" back={{ label: "Back to Support", to: "/support" }} />
        <CardSkeletonGrid count={3} />
      </div>
    )
  }
  if (isError || !ticket) return <ErrorState title="Unable to load this ticket" onRetry={() => refetch()} />

  const canManage = hasPermission("support.manage")

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageHeader
        back={{ label: "Back to Support", to: "/support" }}
        title={ticket.subject}
        description={`Opened ${formatDateTime(ticket.createdAt)}`}
        actions={
          canManage ? (
            <Select value={ticket.status} onValueChange={(v) => statusMutation.mutate(v as SupportTicketStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge config={TICKET_STATUS_CONFIG} status={ticket.status} />
          )
        }
      />

      <PlayerContextCard ticketId={id} player={ticket.player} recentActivity={ticket.recentActivity} />

      <ol className="flex flex-col gap-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={`flex ${m.author === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg border p-3 ${m.author === "admin" ? "border-primary/30 bg-primary/10" : "border-border bg-card"}`}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {m.author === "admin" ? "Support team" : ticket.player.username} · {formatDateTime(m.createdAt)}
              </p>
              <p className="text-sm whitespace-pre-wrap text-foreground">{m.body}</p>
              {m.attachmentUrl && (
                <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block w-fit">
                  <img src={m.attachmentUrl} alt="Attachment" className="max-h-48 w-auto rounded-md border border-border" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = message.trim()
            if (!trimmed) return
            replyMutation.mutate(trimmed)
          }}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <label htmlFor="admin-reply" className="sr-only">
            Reply
          </label>
          <textarea
            id="admin-reply"
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Type your reply…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button type="submit" disabled={replyMutation.isPending || !message.trim()} className="w-fit">
            <Send className="size-3.5" />
            {replyMutation.isPending ? "Sending…" : "Send reply"}
          </Button>
        </form>
      )}
    </div>
  )
}
