import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@/hooks/useAuth"

const quickStakes = [100, 200, 500, 1000, 2000, 5000]

/**
 * Right-column betslip. UI-only: there's no real odds feed or bet-placement
 * API yet, so it always shows the "select an event" empty state — the quick
 * stake buttons and confirm-before-placing toggle are wired to local state
 * so the panel isn't just static, but nothing here calls a backend.
 */
export function BetslipPanel() {
  const { isAuthenticated } = useAuth()
  const [tab, setTab] = useState<"betslip" | "open">("betslip")
  const [stake, setStake] = useState(0)
  const [confirmBeforePlacing, setConfirmBeforePlacing] = useState(false)

  return (
    <aside
      aria-label="Betslip"
      className="hidden w-80 shrink-0 overflow-y-auto border-l border-[color:var(--sb-border)] bg-[color:var(--sb-content-bg)] xl:block"
    >
      <div className="flex" role="tablist" aria-label="Betslip view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "betslip"}
          onClick={() => setTab("betslip")}
          className={`flex-1 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:ring-[color:var(--sb-accent-gold)] ${
            tab === "betslip"
              ? "bg-[color:var(--sb-navbar-bg)] text-[color:var(--sb-navbar-fg)]"
              : "bg-[color:var(--sb-content-alt)] text-[color:var(--sb-text-secondary)]"
          }`}
        >
          Betslip
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "open"}
          onClick={() => setTab("open")}
          className={`flex-1 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:ring-[color:var(--sb-accent-gold)] ${
            tab === "open"
              ? "bg-[color:var(--sb-navbar-bg)] text-[color:var(--sb-navbar-fg)]"
              : "bg-[color:var(--sb-content-alt)] text-[color:var(--sb-text-secondary)]"
          }`}
        >
          Open Bets
        </button>
      </div>

      {tab === "betslip" ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="betslip-odds" className="mb-1 block text-xs font-medium text-[color:var(--sb-text-secondary)]">
                Odds
              </label>
              <input
                id="betslip-odds"
                type="text"
                placeholder="Enter Odds"
                disabled
                className="w-full rounded-[var(--sb-radius-sm)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] px-3 py-2 text-sm text-[color:var(--sb-text-primary)] outline-none placeholder:text-[color:var(--sb-text-secondary)] disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="betslip-stake" className="mb-1 block text-xs font-medium text-[color:var(--sb-text-secondary)]">
                Stake
              </label>
              <input
                id="betslip-stake"
                type="number"
                min={0}
                value={stake || ""}
                onChange={(e) => setStake(Number(e.target.value) || 0)}
                placeholder="Max bet: 0"
                className="w-full rounded-[var(--sb-radius-sm)] border border-[color:var(--sb-border)] px-3 py-2 text-sm text-[color:var(--sb-text-primary)] outline-none placeholder:text-[color:var(--sb-text-secondary)] focus:border-[color:var(--sb-accent-gold)]"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-between text-xs text-[color:var(--sb-text-secondary)]">
            <span>Max mkt : 0</span>
            <span>Max bet : 0</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {quickStakes.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setStake((s) => s + amount)}
                className="rounded-[var(--sb-radius-sm)] py-2 text-sm font-semibold text-[color:var(--sb-navbar-fg)] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
                style={{ background: "var(--sb-navbar-bg-raised)" }}
              >
                + {amount.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStake(0)}
              className="rounded-[var(--sb-radius-sm)] border border-[color:var(--sb-border)] py-2.5 text-sm font-semibold text-[color:var(--sb-text-primary)] outline-none transition-colors hover:bg-[color:var(--sb-content-alt)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            >
              Cancel Bet
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                disabled
                className="rounded-[var(--sb-radius-sm)] py-2.5 text-sm font-semibold text-[color:var(--sb-accent-gold-fg)] opacity-50"
                style={{ background: "var(--sb-accent-gold)" }}
              >
                Place Bet
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center rounded-[var(--sb-radius-sm)] py-2.5 text-center text-sm font-semibold text-[color:var(--sb-accent-gold-fg)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
                style={{ background: "var(--sb-accent-gold)" }}
              >
                Login
              </Link>
            )}
          </div>

          <p role="status" className="mt-4 rounded-[var(--sb-radius-sm)] bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
            Please select an event to place a bet.
          </p>

          <label className="mt-5 flex items-center justify-between text-sm text-[color:var(--sb-text-primary)]">
            Confirm bet before placing
            <button
              type="button"
              role="switch"
              aria-checked={confirmBeforePlacing}
              onClick={() => setConfirmBeforePlacing((v) => !v)}
              className={`relative h-5 w-9 rounded-[var(--sb-radius-full)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] ${
                confirmBeforePlacing ? "" : "bg-[color:var(--sb-border)]"
              }`}
              style={confirmBeforePlacing ? { background: "var(--sb-accent-gold)" } : undefined}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                  confirmBeforePlacing ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>
      ) : (
        <p className="p-4 text-sm text-[color:var(--sb-text-secondary)]">No open bets yet.</p>
      )}
    </aside>
  )
}
