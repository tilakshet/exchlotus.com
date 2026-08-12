import type { ReactNode } from "react"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingFooter } from "@/components/landing/LandingFooter"
import { ScrollToTop } from "@/components/shared/ScrollToTop"

/**
 * Shared chrome for the static info/support pages (About, Careers, Blog,
 * Contact, Help Center, FAQ, Responsible Gaming). Reuses the same
 * LandingHeader/LandingFooter the homepage uses — there's no app-wide
 * layout route (see __root.tsx), so every top-level route composes its own
 * chrome, and this is that composition done once instead of seven times.
 * `pt-36 sm:pt-40` clears the fixed/sticky LandingHeader (two stacked rows),
 * which the homepage itself doesn't need since its hero intentionally sits
 * underneath the header.
 */
export function InfoPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="landing-theme">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <LandingHeader />
      <main id="main-content" className="min-h-screen pt-36 sm:pt-40">
        {children}
      </main>
      <LandingFooter />
      <ScrollToTop />
    </div>
  )
}
