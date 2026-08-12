import { useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Link } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardShell"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useAuth } from "@/hooks/useAuth"
import { WalletChip, ProfileChip } from "@/components/dashboard-shell/TopNavbar"

/**
 * Off-canvas nav for <1024px viewports — the Sidebar's mobile equivalent,
 * and also where the account controls (wallet/deposit, profile, logout)
 * live on mobile instead of a second separate slide-down panel — one
 * accessible (Radix Dialog) mobile menu, not two. Built on Radix Dialog
 * (same primitive GameLaunchModal uses) so focus trap / Escape-to-close /
 * return-focus-to-trigger / background scroll lock all come from Radix
 * defaults, not hand-rolled here. `open` is controlled locally (rather than
 * Dialog.Close-wrapping every interactive element) so WalletChip/
 * ProfileChip's own Link/button handlers can close the drawer via the same
 * `onNavigate` callback without needing Dialog.Close's asChild wrapping
 * around code they don't own.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const close = () => setOpen(false)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-(--landing-radius-md) text-(--landing-text-primary) outline-none transition-colors hover:bg-(--landing-hover-tint) focus-visible:ring-2 focus-visible:ring-(--landing-gold) lg:hidden"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 motion-reduce:transition-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-[color:var(--sb-content-bg)] shadow-2xl outline-none motion-reduce:transition-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left">
          <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[color:var(--sb-border)] px-4">
            <DialogPrimitive.Title className="text-sm font-bold text-[color:var(--sb-text-primary)]">
              Navigation menu
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close navigation menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[color:var(--sb-text-secondary)] outline-none hover:bg-[color:var(--sb-content-alt)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)]"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
            {isAuthenticated && (
              <div className="flex flex-col gap-3 border-b border-[color:var(--sb-border)] pb-4">
                <div onClick={close}>
                  <WalletChip full />
                </div>
                <ProfileChip full onNavigate={close} />
              </div>
            )}

            <nav aria-label="Main" className="flex flex-col gap-1">
              {DASHBOARD_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/dashboard" }}
                  onClick={close}
                  className="flex min-h-11 items-center gap-3 rounded-[var(--sb-radius-md)] px-3.5 py-2.5 text-sm font-semibold text-[color:var(--sb-text-secondary)] outline-none transition-colors hover:bg-[color:var(--sb-content-alt)] hover:text-[color:var(--sb-text-primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--sb-accent-gold)] data-[status=active]:bg-[color:var(--sb-content-alt)] data-[status=active]:text-[color:var(--sb-accent-gold)]"
                >
                  <item.icon className="size-5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="border-t border-[color:var(--sb-border)] p-3">
            <ThemeToggle />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
