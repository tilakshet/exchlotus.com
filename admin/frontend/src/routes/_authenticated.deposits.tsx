import { createFileRoute } from "@tanstack/react-router"
import { ArrowDownToLine } from "lucide-react"
import { LedgerList } from "@/components/shared/LedgerList"

export const Route = createFileRoute("/_authenticated/deposits")({
  component: DepositsPage,
})

function DepositsPage() {
  return (
    <LedgerList
      title="Deposits"
      description="Every deposit credited to a player's wallet."
      icon={ArrowDownToLine}
      types={["DEPOSIT"]}
      emptyTitle="No deposits match this search"
      emptyDescription="Try a different username or player ID."
    />
  )
}
