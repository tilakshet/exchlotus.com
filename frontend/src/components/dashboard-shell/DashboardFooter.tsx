// Same footer as the public landing page (LandingFooter) — not a
// dashboard-specific trim. `--landing-*` tokens are global (:root), not
// scoped to the landing page's `.landing-theme` class, so this renders
// identically here without needing that wrapper.
export { LandingFooter as DashboardFooter } from "@/components/landing/LandingFooter"
