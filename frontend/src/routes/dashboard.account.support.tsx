import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LifeBuoy, MessageCircle, Plus } from "lucide-react"
import { useSupportTickets } from "@/hooks/useSupportTickets"
import type { SupportTicketStatus } from "@/types/support"

export const Route = createFileRoute("/dashboard/account/support")({
  component: SupportPage,
})

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

// Same pending/success semantic pair the rest of the account section uses
// for payment status (--acc-pending for "awaiting action", --acc-success
// for "done") — CLOSED gets the neutral text-secondary tone since it's
// neither, just archived.
const STATUS_STYLE: Record<SupportTicketStatus, { fg: string; bg: string }> = {
  OPEN: { fg: "var(--acc-pending-fg)", bg: "var(--acc-pending-bg)" },
  IN_PROGRESS: { fg: "var(--acc-pending-fg)", bg: "var(--acc-pending-bg)" },
  RESOLVED: { fg: "var(--acc-success-fg)", bg: "var(--acc-success-bg)" },
  CLOSED: { fg: "var(--acc-text-secondary)", bg: "var(--acc-border)" },
}

function StatusPill({ status }: { status: SupportTicketStatus }) {
  const style = STATUS_STYLE[status]
  return (
    <span className="inline-flex items-center rounded-[var(--acc-radius-full)] px-3 py-1 text-xs font-semibold" style={{ color: style.fg, background: style.bg }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Give it a short subject").max(200),
  message: z.string().trim().min(10, "Tell us a bit more — at least 10 characters").max(4000),
})
type TicketValues = z.infer<typeof ticketSchema>

const inputClass = "w-full rounded-[var(--acc-radius-md)] border px-4 py-3.5 text-base font-medium outline-none focus:border-[color:var(--acc-accent)] disabled:opacity-60"
const inputStyle = { background: "var(--acc-input-bg)", color: "var(--acc-input-fg)", borderColor: "var(--acc-input-border)" } as const

function NewTicketForm({ onDone }: { onDone: () => void }) {
  const { createTicket, isCreating } = useSupportTickets()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketValues>({ resolver: zodResolver(ticketSchema) })

  async function onSubmit(values: TicketValues) {
    setFormError(null)
    try {
      await createTicket(values)
      onDone()
    } catch {
      setFormError("Couldn't submit your query — please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-6">
      <div>
        <label htmlFor="ticket-subject" className="mb-2 block text-base font-semibold text-[color:var(--acc-text-primary)]">
          Subject
        </label>
        <input id="ticket-subject" className={inputClass} style={inputStyle} placeholder="What's this about?" aria-invalid={!!errors.subject} {...register("subject")} />
        {errors.subject && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors.subject.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="ticket-message" className="mb-2 block text-base font-semibold text-[color:var(--acc-text-primary)]">
          Message
        </label>
        <textarea
          id="ticket-message"
          rows={5}
          className={inputClass}
          style={inputStyle}
          placeholder="Describe the issue — include any relevant transaction/reference IDs if you have them."
          aria-invalid={!!errors.message}
          {...register("message")}
        />
        {errors.message && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isCreating}
          className="h-12 rounded-[var(--acc-radius-md)] px-8 text-base font-bold outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
        >
          {isCreating ? "Submitting…" : "Submit"}
        </button>
        <button type="button" onClick={onDone} className="h-12 rounded-[var(--acc-radius-md)] border px-6 text-base font-semibold" style={{ borderColor: "var(--acc-border)", color: "var(--acc-text-secondary)" }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function SupportPage() {
  const { tickets, isLoading, isError, refetch } = useSupportTickets()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {showForm ? (
        <NewTicketForm onDone={() => setShowForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-12 w-fit items-center gap-2 rounded-[var(--acc-radius-md)] px-6 text-base font-bold outline-none transition-opacity"
          style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
        >
          <Plus className="size-5" aria-hidden="true" />
          New support query
        </button>
      )}

      {isLoading && <p className="text-[color:var(--acc-text-secondary)]">Loading your tickets…</p>}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] p-10 text-center">
          <p className="text-[color:var(--acc-text-secondary)]">Couldn't load your support tickets.</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold underline" style={{ color: "var(--acc-accent)" }}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && tickets.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[var(--acc-radius-lg)] border border-dashed border-[color:var(--acc-border)] p-10 text-center">
          <LifeBuoy className="size-8" style={{ color: "var(--acc-text-secondary)" }} aria-hidden="true" />
          <p className="font-semibold text-[color:var(--acc-text-primary)]">No support queries yet</p>
          <p className="text-sm text-[color:var(--acc-text-secondary)]">Raise one above and our team will get back to you here.</p>
        </div>
      )}

      {!isLoading && !isError && tickets.length > 0 && (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to="/dashboard/account/support/$id"
                params={{ id: ticket.id }}
                className="flex items-center justify-between gap-4 rounded-[var(--acc-radius-lg)] border border-[color:var(--acc-border)] bg-[color:var(--acc-surface)] p-5 outline-none transition-colors hover:bg-[color:var(--acc-bg)] focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MessageCircle className="size-5 shrink-0" style={{ color: "var(--acc-text-secondary)" }} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[color:var(--acc-text-primary)]">{ticket.subject}</p>
                    <p className="text-xs text-[color:var(--acc-text-secondary)]">
                      {ticket.messageCount} message{ticket.messageCount === 1 ? "" : "s"} · updated {new Date(ticket.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StatusPill status={ticket.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
