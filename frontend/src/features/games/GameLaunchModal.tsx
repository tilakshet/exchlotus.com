import { useEffect, useRef, useState } from "react"
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
const REVEAL_ZONE_PX = 60
const HIDE_DELAY_MS = 2000

export function GameLaunchModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const launchGame = useLaunchGame()
  const queryClient = useQueryClient()
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null)
  const [showClose, setShowClose] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Close button is hidden by default so the game gets the full device
  // screen; it reappears when the pointer/touch nears the top edge and
  // fades back out after a couple seconds of inactivity there.
  useEffect(() => {
    function reveal(clientY: number) {
      if (clientY > REVEAL_ZONE_PX) return
      setShowClose(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setShowClose(false), HIDE_DELAY_MS)
    }
    function onMouseMove(e: MouseEvent) {
      reveal(e.clientY)
    }
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      if (touch) reveal(touch.clientY)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("touchstart", onTouchStart)
    hideTimer.current = setTimeout(() => setShowClose(false), HIDE_DELAY_MS)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("touchstart", onTouchStart)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
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

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close game"
              className={`fixed right-3 top-1/2 z-[60] flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-100 outline-none backdrop-blur transition-opacity duration-300 hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] sm:top-3 sm:translate-y-0 ${
                showClose ? "sm:opacity-100" : "sm:pointer-events-none sm:opacity-0"
              }`}
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
