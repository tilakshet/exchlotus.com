import { apiRequest } from "./http"
import type { Category, HomeFeedShelf } from "@/types/catalog"

export function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>("/api/catalog/categories")
}

/** Every category's first page of games in one request — see backend catalog.service.ts's listHomeFeed doc comment for why this replaced one /games request per category. */
export function getHomeFeed(): Promise<HomeFeedShelf[]> {
  return apiRequest<HomeFeedShelf[]>("/api/catalog/home-feed")
}

export interface SyncCatalogResult {
  providersImported: number
  categoriesImported: number
  gamesImported: number
}

export function syncCatalog(): Promise<SyncCatalogResult> {
  return apiRequest<SyncCatalogResult>("/api/catalog/sync", { method: "POST" })
}
