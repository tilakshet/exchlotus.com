import { createFileRoute } from "@tanstack/react-router"
import { ArrowUpFromLine } from "lucide-react"
import { LedgerList } from "@/components/shared/LedgerList"

export const Route = createFileRoute("/_authenticated/withdrawals")({
  component: WithdrawalsPage,
})

function WithdrawalsPage() {
  return (
    <LedgerList
      title="Withdrawals"
      description="Every withdrawal debited from a player's wallet."
      icon={ArrowUpFromLine}
      types={["WITHDRAWAL"]}
      emptyTitle="No withdrawals match this search"
      emptyDescription="Try a different username or player ID."
    />
  )
}
