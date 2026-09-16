import { useEffect } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Link } from "@tanstack/react-router"
import { Coins, PartyPopper, X } from "lucide-react"
import { useBonusRules } from "@/hooks/useBonus"

const AUTO_DISMISS_MS = 3000

/**
 * One-shot celebration popup shown exactly once, right after a brand-new
 * signup — mounted by DashboardLayout (routes/dashboard.tsx) whenever
 * auth.signupCelebrationPending is true, and dismissed (which clears that
 * flag via onClose) either automatically after AUTO_DISMISS_MS or by the
 * player closing it early. Coin amount comes from GET /api/bonus/rules,
 * not hardcoded, so it never drifts from the actual awarded amount.
 */
export function WelcomeBonusModal({ onClose }: { onClose: () => void }) {
  const { data: rules } = useBonusRules()

  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-(--sb-radius-lg) border border-(--sb-border) bg-(--sb-content-bg) p-6 text-center shadow-2xl duration-200 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full text-(--sb-text-secondary) outline-none transition-colors hover:bg-(--sb-border) focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </DialogPrimitive.Close>

          <span
            className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--sb-accent-gold) 16%, transparent)" }}
          >
            <PartyPopper className="size-8" style={{ color: "var(--sb-accent-gold)" }} aria-hidden="true" strokeWidth={2} />
          </span>

          <DialogPrimitive.Title className="text-xl font-bold text-(--sb-text-primary)">Welcome Bonus Unlocked!</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1.5 text-sm text-(--sb-text-secondary)">
            {rules ? (
              <>
                You&rsquo;ve been credited{" "}
                <span className="font-semibold text-(--sb-text-primary)">{rules.welcomeBonusCoins.toLocaleString("en-IN")} bonus coins</span> — worth ₹
                {rules.welcomeBonusCoins / rules.coinsPerRupee}.
              </>
            ) : (
              "You've been credited bonus coins for signing up."
            )}
          </DialogPrimitive.Description>

          <Link
            to="/dashboard/bonus"
            onClick={onClose}
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-(--sb-radius-md) text-sm font-bold outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
            style={{ background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }}
          >
            <Coins className="size-4" aria-hidden="true" />
            View Bonus Wallet
          </Link>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
