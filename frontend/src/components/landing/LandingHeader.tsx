import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { Wallet, ChevronDown, LayoutDashboard, LogOut, Search, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Logo } from "@/components/shared/Logo"
import { UserAvatar } from "@/components/shared/UserAvatar"

/**
 * Sticky header: logo, search, theme toggle, auth — always visible at every
 * width, no hamburger. Carries a real backdrop-blurred backing at all times
 * — not just once scrolled — since it sits directly over the hero
 * carousel's own artwork/gradients, which are bright and busy enough in
 * places (gold wheel hubs, lit scenes) that a fully transparent header
 * would be hard to read against. Scrolling just deepens the same backing
 * into a fully solid bar.
 */
export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? "bg-(--landing-bg-1) border-(--landing-border-strong) shadow-[0_4px_28px_rgb(0_0_0/45%)]"
          : "bg-[color-mix(in_srgb,var(--landing-bg-1)_68%,transparent)] border-(--landing-border)"
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="#hero"
          className="group rounded-sm px-1 outline-none transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
        >
          <Logo heightClass="h-12 sm:h-16" />
        </a>

        <div className="ml-auto flex items-center justify-end gap-3">
          <HeaderSearch />
          <ThemeToggle />

          {isAuthenticated ? (
            <ProfileMenu />
          ) : (
            <Link
              to="/login"
              search={{ view: "otp" }}
              className="landing-cta-blue landing-shine shrink-0 whitespace-nowrap rounded-(--landing-radius-sm) px-8 py-4 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * Expand-in-place search field. There's no search backend/route wired up
 * yet, so submitting is a no-op for now — the interaction itself (expand,
 * focus, Escape to close, collapse on blur when empty) is real and
 * complete; it's just not connected to results yet.
 */
function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function openSearch() {
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function closeSearch() {
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="flex items-center">
      <AnimatePresence initial={false}>
        {open && (
          <motion.input
            ref={inputRef}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 160, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            onBlur={() => !query && setOpen(false)}
            type="search"
            placeholder="Search games…"
            aria-label="Search games"
            className="landing-glass mr-1 rounded-(--landing-radius-full) px-3.5 py-1.5 text-sm text-(--landing-text-primary) outline-none placeholder:text-(--landing-text-muted) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => (open ? closeSearch() : openSearch())}
        aria-label={open ? "Close search" : "Search"}
        className="rounded-full p-2.5 text-(--landing-text-secondary) outline-none transition-colors hover:bg-(--landing-hover-tint) hover:text-(--landing-text-primary) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
      >
        {open ? <X className="size-5.5" aria-hidden="true" /> : <Search className="size-5.5" aria-hidden="true" />}
      </button>
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const { data: wallet, isLoading: walletLoading } = useWallet()
  const navigate = useNavigate()

  if (!user) return null

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden origin-center items-center gap-2 rounded-(--landing-radius-sm) border border-(--landing-border) px-4 py-2.5 text-base text-(--landing-text-primary) transition-transform duration-300 ease-out hover:scale-110 sm:flex">
        <Wallet className="size-6.5 text-(--landing-emerald)" aria-hidden="true" />
        {walletLoading || !wallet ? (
          <span className="inline-block h-4 w-14 animate-pulse rounded bg-(--landing-border-strong)" aria-label="Loading wallet balance" />
        ) : (
          <span aria-label={`Wallet balance ${wallet.balance.toLocaleString("en-IN")} rupees`}>
            ₹{wallet.balance.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <Link
        to="/dashboard"
        className="landing-glow rounded-(--landing-radius-sm) bg-(--landing-gold) px-3.5 py-1.5 text-sm font-semibold text-(--landing-gold-fg) outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
      >
        Deposit
      </Link>

      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-(--landing-border) bg-(--landing-bg-2) py-1 pr-3 pl-1 text-sm font-medium text-(--landing-text-primary) outline-none transition-colors hover:border-(--landing-border-strong) hover:bg-(--landing-bg-3) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
          >
            <UserAvatar sizeClassName="size-9" background="var(--landing-gold)" color="var(--landing-gold-fg)" className="ring-2 ring-(--landing-gold)/30" />
            <span className="hidden sm:inline">{user.username}</span>
            <ChevronDown className="size-4.5 text-(--landing-text-secondary)" aria-hidden="true" />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="end"
            sideOffset={8}
            className="landing-card z-60 min-w-48 rounded-(--landing-radius-md) p-1.5 text-sm text-(--landing-text-primary)"
          >
            <DropdownMenuPrimitive.Item
              onSelect={() => navigate({ to: "/dashboard" })}
              className="flex cursor-pointer items-center gap-2 rounded-(--landing-radius-sm) px-3 py-2 outline-none data-highlighted:bg-(--landing-hover-tint)"
            >
              <LayoutDashboard className="size-5.5" aria-hidden="true" />
              Dashboard
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              onSelect={() => logout()}
              className="flex cursor-pointer items-center gap-2 rounded-(--landing-radius-sm) px-3 py-2 text-(--landing-text-secondary) outline-none data-highlighted:bg-(--landing-hover-tint)"
            >
              <LogOut className="size-5.5" aria-hidden="true" />
              Log out
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  )
}
