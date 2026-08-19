import { createFileRoute } from "@tanstack/react-router"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { LandingSidebar } from "@/components/landing/LandingSidebar"
import { BottomNavBar } from "@/components/dashboard-shell/BottomNavBar"
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardShell"
import { HeroCarousel } from "@/components/HeroCarousel/HeroCarousel"
import { ProviderLogoCarousel } from "@/components/shared/ProviderLogoCarousel"
import { RecentBigWinsRow } from "@/components/landing/RecentBigWinsRow"
import { TrendingGamesRow } from "@/components/landing/TrendingGamesRow"
import { FavoritesRow } from "@/components/landing/FavoritesRow"
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
 * header-height offset); the `lg:pl-44` below reserves its width in normal
 * flow so hero/sections/footer never render underneath it. Below 1024px,
 * LandingSidebar hides and BottomNavBar (same DASHBOARD_NAV_ITEMS, same
 * component as dashboard.tsx) takes over as primary navigation — the
 * `pb-24` on this wrapper keeps the floating bar from covering the footer.
 */
function LandingPage() {
  return (
    <div className="landing-theme">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <LandingHeader />
      <LandingSidebar />
      <div className="pb-24 lg:pb-0 lg:pl-44">
        <main id="main-content">
          <HeroCarousel />
          <SectionContainer ariaLabel="Game providers" className="py-4!">
            <ProviderLogoCarousel />
          </SectionContainer>
          <SectionContainer ariaLabel="Recent big wins" className="py-8!">
            <RecentBigWinsRow />
          </SectionContainer>
          <SectionContainer ariaLabel="Trending and favorite games" className="py-8!">
            <div className="flex flex-col gap-8">
              <TrendingGamesRow />
              <FavoritesRow />
            </div>
          </SectionContainer>
          <SectionContainer ariaLabel="Browse by category">
            <CategoryGameRows />
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
      <BottomNavBar items={DASHBOARD_NAV_ITEMS} />
      <ScrollToTop />
    </div>
  )
}
