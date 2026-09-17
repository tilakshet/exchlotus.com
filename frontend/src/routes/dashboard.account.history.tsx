import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Gift, History as HistoryIcon, ReceiptText, Wallet as WalletIcon } from "lucide-react"
import { useTransactionPage } from "@/hooks/useTransactionPage"
import { TransactionTable } from "@/features/account/TransactionTable"
import type { LedgerEntryType } from "@/types/wallet"

export const Route = createFileRoute("/dashboard/account/history")({
  component: HistoryPage,
})

type Tab = "transaction" | "payment" | "game" | "bonus"

const tabs: { id: Tab; label: string; icon: typeof HistoryIcon; types: LedgerEntryType[] | null }[] = [
  { id: "transaction", label: "Transaction", icon: HistoryIcon, types: null },
  { id: "payment", label: "Payment", icon: WalletIcon, types: ["DEPOSIT", "WITHDRAWAL"] },
  { id: "game", label: "Game", icon: ReceiptText, types: ["BET", "WIN", "REFUND"] },
  { id: "bonus", label: "Bonus", icon: Gift, types: ["ADJUSTMENT"] },
]

/**
 * All 4 tabs read the same real ledger page (useTransactionPage), filtered
 * client-side by entry type — not separate fake datasets. One consequence
 * of filtering client-side over server-paged data: a page of N raw entries
 * may show fewer than N rows on a filtered tab (e.g. a page with 2 deposits
 * shows 2 rows on "Payment", not a full page) — the pager still moves
 * through the real underlying ledger, just at 50/page to keep filtered
 * tabs reasonably populated.
 */
function HistoryPage() {
  const [tab, setTab] = useState<Tab>("transaction")
  const { items, isLoading, isError, refetch, hasNext, hasPrev, nextPage, prevPage } = useTransactionPage(50)

  const activeTypes = tabs.find((t) => t.id === tab)!.types
  const filteredItems = useMemo(() => (activeTypes ? items.filter((entry) => activeTypes.includes(entry.type)) : items), [items, activeTypes])

  return (
    <div className="flex flex-col gap-7">
      <div role="tablist" aria-label="History filter" className="flex flex-wrap gap-2.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="flex h-11 items-center gap-2 rounded-[var(--acc-radius-full)] border px-5 text-base font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--acc-accent)]"
              style={active ? { background: "var(--acc-accent)", borderColor: "var(--acc-accent)", color: "var(--acc-accent-fg)" } : { background: "var(--acc-surface)", borderColor: "var(--acc-border)", color: "var(--acc-text-primary)" }}
            >
              <Icon className="size-5.5" aria-hidden="true" strokeWidth={2.1} />
              {label}
            </button>
          )
        })}
      </div>

      <TransactionTable items={filteredItems} isLoading={isLoading} isError={isError} onRetry={refetch} hasNext={hasNext} hasPrev={hasPrev} onNext={nextPage} onPrev={prevPage} />
    </div>
  )
}
