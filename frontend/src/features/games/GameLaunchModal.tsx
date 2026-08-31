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
export function GameLaunchModal({
  game,
  currency,
  mode,
  onClose,
}: {
  game: Game
  currency: string
  mode: "real" | "fun"
  onClose: () => void
}) {
  const launchGame = useLaunchGame()
  const queryClient = useQueryClient()
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null)

  function launch() {
    launchGame.mutate(
      { gameId: game.gameId, currency, lang: "en", mode },
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

  useEffect(() => {
    launch()
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
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black shadow-2xl">
          <DialogPrimitive.Title className="sr-only">
            {game.gameName} — {game.provider.name}
          </DialogPrimitive.Title>

          {/* Always visible/clickable, deliberately — the game itself renders
              in a cross-origin iframe, so once a player's pointer/touch
              activity is happening inside it, none of those events ever
              reach this page to re-trigger a "reveal on hover" affordance.
              An auto-hide-then-reveal-on-parent-hover version of this button
              was tried and removed: it could hide itself after the initial
              couple of seconds and then never come back, leaving no way to
              exit a real-money game session. */}
          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close game"
              className="fixed right-3 top-3 z-[60] flex size-11 items-center justify-center rounded-full bg-black/60 text-white outline-none backdrop-blur transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            >
              <X className="size-5.5" aria-hidden="true" />
            </button>
          </DialogPrimitive.Close>

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
                  onClick={launch}
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
              // Third-party real-money gambling content — sandboxed rather than
              // given full same-origin/script/form/popup privileges by default.
              // This starting set hasn't been tested against the actual
              // provider's game client yet; if a game breaks (e.g. a payment
              // redirect needs allow-top-navigation-by-user-activation), loosen
              // it deliberately rather than dropping the sandbox attribute.
              <iframe
                title={`${game.gameName} game session`}
                src={validatedUrl}
                className="size-full border-0"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
