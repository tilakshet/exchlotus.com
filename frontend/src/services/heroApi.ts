import { apiRequest } from "@/api/http"
import type { HeroBanner } from "@/types/hero"

export function getHeroBanners(): Promise<HeroBanner[]> {
  return apiRequest<HeroBanner[]>("/api/home/hero-banners", { anonymous: true })
}
