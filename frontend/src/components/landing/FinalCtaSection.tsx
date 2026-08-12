import { Link } from "@tanstack/react-router"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { useAuth } from "@/hooks/useAuth"

export function FinalCtaSection() {
  const { isAuthenticated } = useAuth()

  return (
    <SectionContainer ariaLabel="Get started" className="text-center">
      <h2 className="text-3xl font-black text-(--landing-text-primary) sm:text-4xl">
        {isAuthenticated ? "Ready for your next game?" : "Ready to play?"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-(--landing-text-secondary)">
        {isAuthenticated
          ? "Jump back into the catalog — sportsbook, live casino, and slots, all in one place."
          : "Create your account in seconds and explore sportsbook, live casino, and slots on one platform."}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {isAuthenticated ? (
          <a
            href="#trending"
            className="landing-glow landing-shine rounded-(--landing-radius-full) bg-(--landing-gold) px-8 py-3.5 text-sm font-black text-(--landing-gold-fg) outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
          >
            Explore Games
          </a>
        ) : (
          <>
            <Link
              to="/login"
              search={{ view: "register" }}
              className="landing-glow landing-shine rounded-(--landing-radius-full) bg-(--landing-gold) px-8 py-3.5 text-sm font-black text-(--landing-gold-fg) outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              search={{ view: "otp" }}
              className="rounded-(--landing-radius-full) border border-(--landing-border-strong) px-8 py-3.5 text-sm font-bold text-(--landing-text-primary) outline-none transition-colors hover:border-(--landing-gold) hover:text-(--landing-gold-text) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            >
              Login
            </Link>
          </>
        )}
      </div>
    </SectionContainer>
  )
}
