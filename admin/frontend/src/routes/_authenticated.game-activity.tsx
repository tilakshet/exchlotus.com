import { createFileRoute } from "@tanstack/react-router"
import { Dices } from "lucide-react"
import { LedgerList } from "@/components/shared/LedgerList"

export const Route = createFileRoute("/_authenticated/game-activity")({
  component: GameActivityPage,
})

function GameActivityPage() {
  return (
    <LedgerList
      title="Game activity"
      description="Bets, wins and refunds across every game — the same ledger as Transactions, filtered to gameplay."
      icon={Dices}
      types={["BET", "WIN", "REFUND"]}
      emptyTitle="No game activity matches this search"
      emptyDescription="Try a different username or player ID."
    />
  )
}
