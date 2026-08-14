import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, CheckCircle2, Dices, Percent, Trophy } from "lucide-react"
import { getGame, setGameEnabled } from "@/api/games.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ErrorState } from "@/components/shared/ErrorState"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { formatCurrency } from "@/lib/utils"
import { ApiError } from "@/api/api-error"

export const Route = createFileRoute("/_authenticated/games/$id")({
  component: GameDetailPage,
})

const GAME_STATUS_CONFIG = {
  true: { label: "Enabled", tone: "success" as const, icon: Dices },
  false: { label: "Disabled", tone: "destructive" as const, icon: Dices },
}

function EnableToggle({ id, gameName, enabled }: { id: string; gameName: string; enabled: boolean }) {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (reason: string) => setGameEnabled(id, !enabled, reason),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["games"] })
      toast({ title: enabled ? "Game disabled" : "Game enabled", description: gameName, variant: "success" })
    },
    onError: (err) => toast({ title: "Action failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (!hasPermission("games.manage")) return null

  return (
    <>
      <Button variant={enabled ? "destructive" : "default"} size="sm" onClick={() => setOpen(true)}>
        {enabled ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
        {enabled ? "Disable" : "Enable"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={enabled ? `Disable ${gameName}?` : `Enable ${gameName}?`}
        description={
          enabled
            ? "The game disappears from the player-facing catalog immediately. Recorded in the audit log."
            : "The game becomes visible in the player-facing catalog immediately. Recorded in the audit log."
        }
        confirmLabel={enabled ? "Disable game" : "Enable game"}
        variant={enabled ? "destructive" : "default"}
        requireReason
        loading={mutation.isPending}
        onConfirm={(reason) => mutation.mutate(reason!)}
      />
    </>
  )
}

function GameDetailPage() {
  const { id } = Route.useParams()
  const { data: game, isLoading, isError, refetch } = useQuery({ queryKey: ["game", id], queryFn: () => getGame(id) })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loading game…" back={{ label: "Back to Games", to: "/games" }} />
        <CardSkeletonGrid count={4} />
      </div>
    )
  }
  if (isError || !game) return <ErrorState title="Unable to load this game" onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ label: "Back to Games", to: "/games" }}
        title={game.gameName}
        description={`${game.provider.name}${game.category ? ` · ${game.category.name}` : ""} · ${game.gameCode}`}
        actions={
          <>
            <StatusBadge config={GAME_STATUS_CONFIG} status={String(game.enabled)} />
            <EnableToggle id={game.id} gameName={game.gameName} enabled={game.enabled} />
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Dices} label="Bets placed" value={game.stats.betCount.toLocaleString()} hint={formatCurrency(game.stats.betVolume)} />
        <MetricCard icon={Trophy} label="Wins paid" value={game.stats.winCount.toLocaleString()} hint={formatCurrency(game.stats.winVolume)} />
        <MetricCard
          icon={Percent}
          label="RTP in practice"
          value={game.stats.rtpInPractice !== null ? `${game.stats.rtpInPractice.toFixed(1)}%` : "—"}
          hint={game.stats.rtpInPractice === null ? "No bets in this game yet" : "Wins ÷ bets over all recorded activity"}
        />
        <MetricCard icon={Percent} label="Provider-quoted RTP" value={game.rtp !== null ? `${game.rtp.toFixed(1)}%` : "—"} hint="As synced from the provider catalog" />
      </section>
    </div>
  )
}
