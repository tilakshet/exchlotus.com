import { AlertCircle, ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react"
import { formatInr } from "@/lib/utils"
import { StatusBadge } from "./StatusBadge"
import type { LedgerEntryType, TransactionHistoryEntry } from "@/types/wallet"

const typeLabel: Record<LedgerEntryType, string> = {
  BET: "Bet",
  WIN: "Win",
  REFUND: "Refund",
  ADJUSTMENT: "Bonus",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
}

const typeDescription: Record<LedgerEntryType, string> = {
  BET: "Wager placed",
  WIN: "Winnings credited",
  REFUND: "Bet refunded",
  ADJUSTMENT: "Manual balance adjustment",
  DEPOSIT: "Funds added",
  WITHDRAWAL: "Funds withdrawn",
}

interface TransactionTableProps {
  items: TransactionHistoryEntry[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
}

export function TransactionTable({ items, isLoading, isError, onRetry, hasNext, hasPrev, onNext, onPrev }: TransactionTableProps) {
  return (
    <div className="overflow-hidden rounded-[var(--acc-radius-md)] border border-[color:var(--acc-border)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead>
            <tr style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}>
              <th scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                Transaction Id
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                Txn Type
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                Status
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                Amount
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                Description
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                Date/Time
              </th>
            </tr>
          </thead>
          <tbody>
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm">
                  <span role="alert" className="inline-flex items-center gap-2 text-red-600">
                    <AlertCircle className="size-5.5" aria-hidden="true" />
                    Couldn't load transactions.
                  </span>{" "}
                  <button type="button" onClick={onRetry} className="font-medium underline">
                    Retry
                  </button>
                </td>
              </tr>
            )}
            {isLoading && !isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--acc-text-secondary)]">
                  <Loader2 className="mx-auto size-5.5 animate-spin" aria-hidden="true" />
                </td>
              </tr>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[color:var(--acc-text-secondary)]">
                  <Inbox className="mx-auto mb-2 size-8.75 opacity-60" aria-hidden="true" />
                  No transactions yet
                </td>
              </tr>
            )}
            {!isLoading &&
              items.map((entry) => (
                <tr key={entry.id} className="border-t border-[color:var(--acc-border-soft)]">
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[color:var(--acc-text-secondary)]">{entry.id.slice(0, 8)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">{typeLabel[entry.type]}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <StatusBadge amount={entry.amount} />
                  </td>
                  <td
                    className="whitespace-nowrap px-5 py-3.5 font-semibold"
                    style={{ color: entry.amount >= 0 ? "var(--acc-success-fg)" : "var(--acc-text-primary)" }}
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {formatInr(entry.amount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-[color:var(--acc-text-secondary)]">{typeDescription[entry.type]}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-[color:var(--acc-text-secondary)]">{new Date(entry.createdAt).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-[color:var(--acc-border-soft)] p-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous page"
          className="flex size-10 items-center justify-center rounded-[var(--acc-radius-sm)] border border-[color:var(--acc-border)] text-[color:var(--acc-text-primary)] transition-opacity disabled:opacity-40"
        >
          <ChevronLeft className="size-4.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next page"
          className="flex size-10 items-center justify-center rounded-[var(--acc-radius-sm)] border border-[color:var(--acc-border)] text-[color:var(--acc-text-primary)] transition-opacity disabled:opacity-40"
        >
          <ChevronRight className="size-4.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
