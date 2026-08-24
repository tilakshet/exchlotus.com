import { useNavigate } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { Bell, Plus, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useProfile } from "@/hooks/useProfile"
import { useAppDispatch, useAppSelector } from "@/store"
import { notificationMarkedRead } from "@/store/notificationSlice"
import { Logo } from "@/components/shared/Logo"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { NavSearchBar } from "@/components/shared/NavSearchBar"

/**
 * Top bar for the /dashboard shell — same `--landing-*` tokens/treatment as
 * LandingHeader (solid blurred bg, gold accents, landing-card dropdowns) so
 * the dashboard and public site read as one product, not two. Wallet
 * balance, notifications, and profile are always visible here on every
 * breakpoint (mobile included) — primary page navigation instead lives in
 * BottomNavBar.tsx below 1024px (see dashboard.tsx/dashboard.account.tsx),
 * not a hamburger drawer. Theme toggle lives in Sidebar.tsx on desktop
 * (≥1024px) and inside ProfileChip's dropdown for mobile — not standalone
 * on the navbar, which stays free for wallet/notifications/profile only.
 * Search (NavSearchBar) is desktop-only, same as LandingHeader.
 */
export function TopNavbar() {
    const { isAuthenticated } = useAuth()

    return (
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b border-(--landing-border-strong) bg-(--landing-bg-1) px-4 py-3 text-(--landing-text-primary) shadow-[0_4px_28px_rgb(0_0_0/25%)] backdrop-blur-xl sm:px-6">
            <Link
                to={isAuthenticated ? "/dashboard" : "/"}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            >
                <Logo heightClass="h-12 sm:h-16" />
            </Link>

            <NavSearchBar />

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
                {isAuthenticated ? (
                    <>
                        <WalletChip />
                        <NotificationBell />
                        <ProfileChip />
                    </>
                ) : (
                    <LoggedOutActions />
                )}
            </div>
        </header>
    )
}

function LoggedOutActions() {
    return (
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <Link
                to="/login"
                search={{ view: "register" }}
                className="landing-cta-green landing-shine flex items-center justify-center gap-1.5 rounded-(--landing-radius-sm) px-8 py-4 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
            >
                Sign Up
            </Link>
            <Link
                to="/login"
                className="landing-cta-purple landing-shine flex items-center justify-center gap-1.5 rounded-(--landing-radius-sm) px-8 py-4 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
            >
                Login
            </Link>
        </div>
    )
}

export function WalletChip() {
    const { data: wallet, isLoading: walletLoading } = useWallet()
    return (
        <div className="group relative transition-transform duration-300 ease-out hover:-translate-y-1">
            {/* Decorative multi-color ring, hidden until hover — bleeds past the
                pill's edge via -inset-0.5 + blur, sits behind it via -z-10. */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-0.5 -z-10 rounded-(--landing-radius-full) bg-gradient-to-r from-(--landing-gold) via-(--landing-purple) to-(--landing-emerald) opacity-0 blur-[3px] transition-opacity duration-300 group-hover:opacity-90"
            />
            <div className="flex items-center gap-2 rounded-(--landing-radius-full) border border-(--landing-border) bg-(--landing-bg-2) py-1.5 pr-1.5 pl-3.5 text-sm font-semibold text-(--landing-text-primary) transition-colors duration-300 group-hover:border-transparent group-hover:bg-(--landing-bg-3)">
                <span className="flex items-center gap-2 sm:gap-2.5">
                    <Wallet
                        className="size-5.5 shrink-0 text-(--landing-emerald) sm:size-6.5"
                        aria-hidden="true"
                        strokeWidth={2}
                    />
                    {walletLoading || !wallet ? (
                        <span className="inline-block h-4 w-14 animate-pulse rounded bg-(--landing-border-strong)" aria-label="Loading wallet balance" />
                    ) : (
                        <span aria-label={`Wallet balance ${wallet.balance.toLocaleString("en-IN")} rupees`} className="whitespace-nowrap">
                            ₹{wallet.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    )}
                </span>
                <Link
                    to="/dashboard/account/deposit"
                    aria-label="Deposit"
                    className="landing-glow flex size-7 shrink-0 items-center justify-center rounded-full bg-(--landing-gold) text-(--landing-gold-fg) outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
                >
                    <Plus className="size-4.5 sm:size-5.5" aria-hidden="true" strokeWidth={2.6} />
                </Link>
            </div>
        </div>
    )
}

/** Real unread count from the socket-fed notification store — not a fabricated badge number. */
export function NotificationBell() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const items = useAppSelector((s) => s.notifications.items)
    const unread = items.filter((n) => !n.read).length

    function handleSelect(notification: (typeof items)[number]) {
        dispatch(notificationMarkedRead(notification.id))
        if (notification.link) navigate({ to: notification.link as "/dashboard" })
    }

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button
                    type="button"
                    aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                    className="relative flex min-h-13 min-w-13 items-center justify-center rounded-full text-(--landing-text-secondary) outline-none transition-all duration-200 hover:scale-110 hover:bg-(--landing-hover-tint) hover:text-(--landing-gold) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                >
                    <Bell className="size-7.5" aria-hidden="true" strokeWidth={2} />
                    {unread > 0 && (
                        <span
                            className="absolute top-1 right-1 flex size-5.5 items-center justify-center rounded-full bg-(--landing-gold) text-[11px] font-bold text-(--landing-gold-fg)"
                        >
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                    align="end"
                    sideOffset={10}
                    className="landing-card z-50 max-h-96 w-80 overflow-y-auto rounded-(--landing-radius-md) p-2 text-sm text-(--landing-text-primary)"
                >
                    {items.length === 0 ? (
                        <p className="px-3 py-6 text-center text-(--landing-text-secondary)">No notifications yet</p>
                    ) : (
                        items.map((n) => (
                            <DropdownMenuPrimitive.Item
                                key={n.id}
                                onSelect={() => handleSelect(n)}
                                className={`flex flex-col gap-0.5 rounded-(--landing-radius-sm) px-3 py-2.5 outline-none data-highlighted:bg-(--landing-hover-tint) ${n.link ? "cursor-pointer" : "cursor-default"}`}
                            >
                                <span className={n.read ? "text-(--landing-text-secondary)" : "font-semibold"}>{n.message}</span>
                                <span className="text-xs text-(--landing-text-secondary)">{new Date(n.createdAt).toLocaleString()}</span>
                            </DropdownMenuPrimitive.Item>
                        ))
                    )}
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    )
}

// No dropdown here (My Account/Log out used to live in one) — a direct
// link straight to the account page, since Log out now lives as its own
// row in Sidebar.tsx instead.
export function ProfileChip() {
    const { user } = useAuth()
    const { data: profile } = useProfile()
    if (!user) return null

    // box-shadow glow instead of a scale transform — scaling the hit target
    // itself shifts its own hover boundary mid-transition, which can
    // retrigger the hover state repeatedly near the edge (looks like the
    // ring "running" on a loop). box-shadow is purely visual and never
    // affects hit-testing, so it can't do that.
    return (
        <Link
            to="/dashboard/account"
            aria-label="My Account"
            className="flex items-center gap-2 rounded-full border border-(--landing-border) bg-(--landing-bg-2) p-1 outline-none transition-colors duration-200 hover:border-(--landing-gold) hover:bg-(--landing-bg-3) hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--landing-gold)_25%,transparent)] focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
        >
            <UserAvatar sizeClassName="size-9" background="var(--landing-gold)" color="var(--landing-gold-fg)" className="ring-2 ring-(--landing-gold)/30" gender={profile?.gender} />
        </Link>
    )
}
