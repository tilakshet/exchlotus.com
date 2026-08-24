import { useEffect, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useProfile } from "@/hooks/useProfile"
import { Logo } from "@/components/shared/Logo"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { NavSearchBar } from "@/components/shared/NavSearchBar"

/**
 * Sticky header: logo, search (desktop only, see NavSearchBar), auth —
 * always visible at every width, no hamburger. Carries a real
 * backdrop-blurred backing at all times
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

        <div className="ml-auto flex min-w-0 items-center justify-end gap-3">
          <NavSearchBar />

          {isAuthenticated ? (
            <ProfileMenu />
          ) : (
            <>
              <Link
                to="/login"
                search={{ view: "register" }}
                className="landing-cta-green landing-shine shrink-0 whitespace-nowrap rounded-(--landing-radius-sm) px-8 py-4 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                search={{ view: "otp" }}
                className="landing-cta-purple landing-shine shrink-0 whitespace-nowrap rounded-(--landing-radius-sm) px-8 py-4 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// No dropdown here (Dashboard/Log out used to live in one) — a direct link
// straight to the account page, same treatment as TopNavbar's ProfileChip.
// Log out lives in the dashboard sidebar (Sidebar.tsx), one click further
// in — landing/dashboard is a single unified auth session either way.
function ProfileMenu() {
  const { user } = useAuth()
  const { data: wallet, isLoading: walletLoading } = useWallet()
  const { data: profile } = useProfile()

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
        to="/dashboard/account"
        aria-label="My Account"
        className="flex items-center gap-2 rounded-full border border-(--landing-border) bg-(--landing-bg-2) p-1 outline-none transition-colors duration-200 hover:border-(--landing-gold) hover:bg-(--landing-bg-3) hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--landing-gold)_25%,transparent)] focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
      >
        <UserAvatar sizeClassName="size-9" background="var(--landing-gold)" color="var(--landing-gold-fg)" className="ring-2 ring-(--landing-gold)/30" gender={profile?.gender} />
      </Link>
    </div>
  )
}
