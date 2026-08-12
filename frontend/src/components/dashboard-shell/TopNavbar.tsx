import { useNavigate } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { Bell, ChevronDown, LayoutDashboard, LogOut, Plus, Star, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useAppDispatch, useAppSelector } from "@/store"
import { notificationMarkedRead } from "@/store/notificationSlice"
import { Logo } from "@/components/shared/Logo"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { CURRENT_LOYALTY_TIER } from "@/features/account/loyalty-tiers"
import { MobileNav } from "@/components/dashboard-shell/MobileNav"

/**
 * Top bar for the /dashboard shell — same `--landing-*` tokens/treatment as
 * LandingHeader (solid blurred bg, gold accents, landing-card dropdowns) so
 * the dashboard and public site read as one product, not two. Structure
 * stays dashboard-specific though: MobileNav's hamburger (page nav drawer)
 * on the left instead of LandingHeader's anchor-link pill row (those anchor
 * to landing-page sections that don't exist here), and the notification
 * bell stays — LandingHeader has none since it doesn't need one. On mobile,
 * wallet/profile controls live inside MobileNav's drawer instead of a
 * second separate slide-down panel — one accessible (Radix Dialog) mobile
 * menu, not two competing ones. Theme toggle lives in the Sidebar/MobileNav
 * drawer, not here (moved out of the navbar per earlier redesign).
 */
export function TopNavbar() {
    const { isAuthenticated } = useAuth()

    return (
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b border-(--landing-border-strong) bg-(--landing-bg-1) px-4 py-3 text-(--landing-text-primary) shadow-[0_4px_28px_rgb(0_0_0/25%)] backdrop-blur-xl sm:px-6">
            <MobileNav />

            <Link
                to={isAuthenticated ? "/dashboard" : "/"}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            >
                <Logo heightClass="h-12 sm:h-16" />
            </Link>

            <div className="ml-auto flex shrink-0 items-center gap-2">
                {isAuthenticated ? (
                    <div className="hidden items-center gap-2.5 lg:flex">
                        <WalletChip />
                        <NotificationBell />
                        <ProfileChip />
                    </div>
                ) : (
                    <div className="hidden lg:block">
                        <LoggedOutActions />
                    </div>
                )}

                <div className="lg:hidden">
                    {isAuthenticated ? <NotificationBell /> : <LoggedOutActions />}
                </div>
            </div>
        </header>
    )
}

function LoggedOutActions() {
    return (
        <Link
            to="/login"
            className="landing-glow landing-shine flex items-center justify-center gap-1.5 rounded-(--landing-radius-full) bg-(--landing-gold) px-4 py-2.5 text-sm font-black text-(--landing-gold-fg) outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
        >
            Login / Sign Up
        </Link>
    )
}

export function WalletChip({ full }: { full?: boolean }) {
    const { data: wallet, isLoading: walletLoading } = useWallet()
    return (
        <div
            className={`flex items-center gap-2 rounded-(--landing-radius-full) border border-(--landing-border) bg-(--landing-bg-2) py-1.5 pr-1.5 pl-3.5 text-sm font-semibold text-(--landing-text-primary) ${full ? "justify-between" : ""}`}
        >
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
    )
}

/** Real unread count from the socket-fed notification store — not a fabricated badge number. */
export function NotificationBell() {
    const dispatch = useAppDispatch()
    const items = useAppSelector((s) => s.notifications.items)
    const unread = items.filter((n) => !n.read).length

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
                                onSelect={() => dispatch(notificationMarkedRead(n.id))}
                                className="flex cursor-pointer flex-col gap-0.5 rounded-(--landing-radius-sm) px-3 py-2.5 outline-none data-highlighted:bg-(--landing-hover-tint)"
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

export function ProfileChip({ full, onNavigate }: { full?: boolean; onNavigate?: () => void }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    if (!user) return null

    async function handleLogout() {
        await logout()
        navigate({ to: "/" })
    }

    if (full) {
        return (
            <div className="flex flex-col gap-2">
                <Link to="/dashboard/account" onClick={onNavigate} className="flex items-center gap-3 rounded-(--landing-radius-md) bg-(--landing-hover-tint) px-3 py-2.5 outline-none hover:bg-(--landing-glass)">
                    <UserAvatar sizeClassName="size-10" background="var(--landing-gold)" color="var(--landing-gold-fg)" />
                    <div>
                        <p className="font-semibold text-(--landing-text-primary)">{user.username}</p>
                        <p className="flex items-center gap-1 text-xs text-(--landing-text-secondary)">
                            <Star className="size-3.5" fill="var(--landing-gold)" stroke="var(--landing-gold)" aria-hidden="true" />
                            {CURRENT_LOYALTY_TIER.name} Tier
                        </p>
                    </div>
                </Link>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-11 items-center gap-2 rounded-(--landing-radius-md) px-3 py-2.5 text-sm font-semibold text-(--landing-text-secondary) outline-none hover:bg-(--landing-hover-tint)"
                >
                    <LogOut className="size-4.5" aria-hidden="true" />
                    Log out
                </button>
            </div>
        )
    }

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-(--landing-border) bg-(--landing-bg-2) py-1 pr-3 pl-1 text-sm font-medium text-(--landing-text-primary) outline-none transition-colors hover:border-(--landing-border-strong) hover:bg-(--landing-bg-3) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                >
                    <UserAvatar sizeClassName="size-8" background="var(--landing-gold)" color="var(--landing-gold-fg)" className="ring-2 ring-(--landing-gold)/30" />
                    <span className="hidden flex-col items-start leading-tight sm:flex">
                        <span className="text-(--landing-text-primary)">{user.username}</span>
                        <span className="flex items-center gap-1 text-xs text-(--landing-gold-text)">
                            <Star className="size-3" fill="var(--landing-gold-text)" stroke="var(--landing-gold-text)" aria-hidden="true" />
                            {CURRENT_LOYALTY_TIER.name}
                        </span>
                    </span>
                    <ChevronDown className="size-4 text-(--landing-text-secondary)" aria-hidden="true" />
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                    align="end"
                    sideOffset={8}
                    className="landing-card z-60 min-w-48 rounded-(--landing-radius-md) p-1.5 text-sm text-(--landing-text-primary)"
                >
                    <DropdownMenuPrimitive.Item asChild className="flex cursor-pointer items-center gap-2 rounded-(--landing-radius-sm) px-3 py-2 outline-none data-highlighted:bg-(--landing-hover-tint)">
                        <Link to="/dashboard/account">
                            <LayoutDashboard className="size-5.5" aria-hidden="true" />
                            My Account
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                        onSelect={() => handleLogout()}
                        className="flex cursor-pointer items-center gap-2 rounded-(--landing-radius-sm) px-3 py-2 text-(--landing-text-secondary) outline-none data-highlighted:bg-(--landing-hover-tint)"
                    >
                        <LogOut className="size-5.5" aria-hidden="true" />
                        Log out
                    </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    )
}
