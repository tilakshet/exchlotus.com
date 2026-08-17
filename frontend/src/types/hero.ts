export interface HeroBanner {
  id: string
  backgroundImage: string
  ctaText: string
  linkType: "game" | "page"
  gameSlug: string | null
  path: string | null
}
