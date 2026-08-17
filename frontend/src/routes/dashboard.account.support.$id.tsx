import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Send } from "lucide-react"
import * as supportApi from "@/api/support.api"
import type { SupportTicketStatus } from "@/types/support"

export const Route = createFileRoute("/dashboard/account/support/$id")({
  component: TicketThreadPage,
})

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

const inputClass = "w-full rounded-[var(--acc-radius-md)] border px-4 py-3.5 text-base font-medium outline-none focus:border-[color:var(--acc-accent)] disabled:opacity-60"
const inputStyle = { background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" } as const

function TicketThreadPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")

  const { data: ticket, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => supportApi.getTicket(id),
  })

  const replyMutation = useMutation({
    mutationFn: (body: string) => supportApi.replyToTicket(id, body),
    onSuccess: () => {
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["support-ticket", id] })
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
    },
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    replyMutation.mutate(trimmed)
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/dashboard/account/support"
        className="inline-flex items-center gap-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
        style={{ color: "var(--acc-text-secondary)" }}
      >
        <ArrowLeft className="size-5.5" aria-hidden="true" strokeWidth={2.2} />
        Back to Support
      </Link>

      {isLoading && <p className="text-[color:var(--acc-text-secondary)]">Loading…</p>}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] p-10 text-center">
          <p className="text-[color:var(--acc-text-secondary)]">Couldn't load this ticket.</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold underline" style={{ color: "var(--acc-accent)" }}>
            Retry
          </button>
        </div>
      )}

      {ticket && (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[color:var(--acc-text-primary)]">{ticket.subject}</h2>
            <span className="text-sm font-semibold" style={{ color: "var(--acc-text-secondary)" }}>
              {STATUS_LABEL[ticket.status]}
            </span>
          </div>

          <ol className="flex flex-col gap-3">
            {ticket.messages.map((m) => (
              <li key={m.id} className={`flex ${m.author === "player" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-[var(--acc-radius-lg)] border p-4"
                  style={
                    m.author === "player"
                      ? { background: "var(--acc-accent-soft)", borderColor: "var(--acc-accent)" }
                      : { background: "var(--acc-surface)", borderColor: "var(--acc-border)" }
                  }
                >
                  <p className="mb-1 text-xs font-semibold" style={{ color: "var(--acc-text-secondary)" }}>
                    {m.author === "player" ? "You" : "Support team"} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p className="text-base whitespace-pre-wrap text-[color:var(--acc-text-primary)]">{m.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-4">
            <label htmlFor="reply-message" className="sr-only">
              Reply
            </label>
            <textarea
              id="reply-message"
              rows={3}
              className={inputClass}
              style={inputStyle}
              placeholder={ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "Reply to reopen this ticket…" : "Type your reply…"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={replyMutation.isPending || !message.trim()}
              className="flex h-11 w-fit items-center gap-2 rounded-[var(--acc-radius-md)] px-6 text-base font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
            >
              <Send className="size-4.5" aria-hidden="true" />
              {replyMutation.isPending ? "Sending…" : "Send"}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
