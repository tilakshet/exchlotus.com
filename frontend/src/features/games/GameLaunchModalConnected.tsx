import { useWallet } from "@/hooks/useWallet"
import { GameLaunchModal } from "./GameLaunchModal"
import type { Game } from "@/types/catalog"

/**
 * Wires GameLaunchModal to the app's actual data sources instead of every
 * call site repeating the same currency lookup — currency comes from the
 * player's existing wallet (never a literal), mode is "real" because that's
 * the only mode this product currently offers a player-facing way to pick;
 * there's no demo/fun-mode UI anywhere in the app today. If one is ever
 * added, this is the one place that needs to start passing something other
 * than "real", not all of GameLaunchModal's callers individually.
 */
export function GameLaunchModalConnected({ game, onClose }: { game: Game; onClose: () => void }) {
  const { data: wallet } = useWallet()
  return <GameLaunchModal game={game} currency={wallet?.currency ?? "INR"} mode="real" onClose={onClose} />
}
