import { useEffect, useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2, X } from "lucide-react"
import { useLaunchGame } from "@/hooks/useGames"
import { friendlyErrorMessage } from "@/api/api-error"
import { walletQueryKey } from "@/hooks/useWallet"
import type { Game } from "@/types/catalog"

/**
 * Game flow per spec: verify auth (caller only opens this once
 * useGatedNavigate/isAuthenticated already passed) → loading modal → POST
 * /game-session/launch → validate the response → render in an iframe →
 * on close, refresh wallet + transaction history + recently-played (the
 * last of which is just a wallet/history query in this implementation, see
 * useRecentlyPlayed.ts, so invalidating wallet history covers it too).
 */
export function GameLaunchModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const launchGame = useLaunchGame()
  const queryClient = useQueryClient()
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null)

  useEffect(() => {
    launchGame.mutate(
      { gameId: game.gameId, currency: "INR", lang: "en", mode: "real" },
      {
        onSuccess: (result) => {
          try {
            const url = new URL(result.launchUrl)
            if (url.protocol !== "https:") throw new Error("non-https launch URL")
            setValidatedUrl(result.launchUrl)
          } catch {
            setValidatedUrl(null)
          }
        },
      }
    )
    // Only ever launch once per modal open — game.gameId is stable for the
    // lifetime of this component (it's remounted, not re-rendered, per game).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    queryClient.invalidateQueries({ queryKey: walletQueryKey })
    queryClient.invalidateQueries({ queryKey: ["wallet", "history"] })
    onClose()
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-[var(--sb-radius-lg)] bg-black shadow-2xl sm:inset-8 lg:inset-10">
          <div className="flex min-h-16 items-center justify-between gap-4 bg-[color:var(--sb-navbar-bg)] px-5 py-3">
            <DialogPrimitive.Title className="min-w-0 text-base font-bold leading-[1.25] text-[color:var(--sb-navbar-fg)]">
              <span className="block truncate">{game.gameName}</span>
              <span className="mt-1 block truncate text-sm font-medium text-[color:var(--sb-navbar-fg-muted)]">
                {game.provider.name}
              </span>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close game"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-[color:var(--sb-navbar-fg)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
              >
                <X className="size-5.5" aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex-1 bg-black">
            {launchGame.isPending && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="size-10 animate-spin" style={{ color: "var(--sb-accent-gold)" }} aria-hidden="true" />
                <p className="text-sm">Launching {game.gameName}…</p>
              </div>
            )}

            {launchGame.isError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
                <AlertCircle className="size-10 text-red-400" aria-hidden="true" />
                <p className="text-sm">{friendlyErrorMessage(launchGame.error)}</p>
                <button
                  type="button"
                  onClick={() =>
                    launchGame.mutate(
                      { gameId: game.gameId, currency: "INR", lang: "en", mode: "real" },
                      {
                        onSuccess: (result) => {
                          try {
                            const url = new URL(result.launchUrl)
                            if (url.protocol !== "https:") throw new Error("non-https launch URL")
                            setValidatedUrl(result.launchUrl)
                          } catch {
                            setValidatedUrl(null)
                          }
                        },
                      }
                    )
                  }
                  className="rounded-[var(--sb-radius-sm)] px-4 py-2 text-sm font-semibold text-[color:var(--sb-accent-gold-fg)]"
                  style={{ background: "var(--sb-accent-gold)" }}
                >
                  Try again
                </button>
              </div>
            )}

            {launchGame.isSuccess && !validatedUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
                <AlertCircle className="size-10 text-red-400" aria-hidden="true" />
                <p className="text-sm">The launch link we got back didn't look right, so we didn't open it.</p>
              </div>
            )}

            {validatedUrl && (
              <iframe title={`${game.gameName} game session`} src={validatedUrl} className="size-full border-0" allow="fullscreen" />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
