import { createFileRoute } from "@tanstack/react-router"
import { ScrollText } from "lucide-react"
import { LedgerList } from "@/components/shared/LedgerList"

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
})

const ALL_TYPES = ["BET", "WIN", "REFUND", "ADJUSTMENT", "DEPOSIT", "WITHDRAWAL"] as const

function TransactionsPage() {
  return (
    <LedgerList
      title="Transactions"
      description="The complete wallet ledger — every bet, win, refund, adjustment, deposit and withdrawal."
      icon={ScrollText}
      types={[...ALL_TYPES]}
      emptyTitle="No transactions match this search"
      emptyDescription="Try a different username or player ID."
    />
  )
}
