import { createFileRoute } from "@tanstack/react-router"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingSidebar } from "@/components/landing/LandingSidebar"
import { HeroCarousel } from "@/components/HeroCarousel/HeroCarousel"
import { ProviderStrip } from "@/components/landing/ProviderStrip"
import { RecentBigWinsRow } from "@/components/landing/RecentBigWinsRow"
import { CategoryGameRows } from "@/components/landing/CategoryGameRows"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { SectionHeading } from "@/components/landing/shared/SectionHeading"
import { WhyExchlotusSection } from "@/components/landing/WhyExchlotusSection"
import { HowItWorksSection } from "@/components/landing/HowItWorksSection"
import { RewardsPreviewSection } from "@/components/landing/RewardsPreviewSection"
import { SecurityTrustSection } from "@/components/landing/SecurityTrustSection"
import { ResponsibleGamingPreviewSection } from "@/components/landing/ResponsibleGamingPreviewSection"
import { FinalCtaSection } from "@/components/landing/FinalCtaSection"
import { LandingFooter } from "@/components/landing/LandingFooter"
import { GameCatalogSection } from "@/features/games/GameCatalogSection"
import { ScrollToTop } from "@/components/shared/ScrollToTop"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

/**
 * Hero → real provider strip → per-category quick-glance rows → the full
 * searchable catalog → footer. Every game/provider/category shown here
 * comes from useCategories()/useGames()/useProviders() against the real
 * backend — no hardcoded marketing fixtures, no fake sports-odds carousel
 * (there's no sportsbook API in this backend to back one with real data).
 * What you see here before logging in is the same catalog you get after.
 * LandingSidebar is fixed (desktop only, see its own doc comment for the
 * header-height offset); the `lg:pl-56` below reserves its width in normal
 * flow so hero/sections/footer never render underneath it.
 */
function LandingPage() {
  return (
    <div className="landing-theme">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <LandingHeader />
      <LandingSidebar />
      <div className="lg:pl-56">
        <main id="main-content">
          <HeroCarousel />
          <ProviderStrip />
          <SectionContainer ariaLabel="Recent big wins" className="py-8!">
            <RecentBigWinsRow />
          </SectionContainer>
          <SectionContainer ariaLabel="Browse by category">
            <SectionHeading eyebrow="Quick picks" title="Browse by category" />
            <div className="mt-8">
              <CategoryGameRows />
            </div>
          </SectionContainer>
          <SectionContainer id="trending" ariaLabel="Game catalog">
            <SectionHeading eyebrow="Play now" title="The full catalog" description="Live from our providers — search, filter, and jump straight in." />
            <div className="mt-8">
              <GameCatalogSection />
            </div>
          </SectionContainer>
          <WhyExchlotusSection />
          <HowItWorksSection />
          <RewardsPreviewSection />
          <SecurityTrustSection />
          <ResponsibleGamingPreviewSection />
          <FinalCtaSection />
        </main>
        <LandingFooter />
      </div>
      <ScrollToTop />
    </div>
  )
}
