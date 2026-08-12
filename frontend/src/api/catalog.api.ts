import { apiRequest } from "./http"
import type { Category } from "@/types/catalog"

export function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>("/api/catalog/categories")
}

export interface SyncCatalogResult {
  providersImported: number
  categoriesImported: number
  gamesImported: number
}

export function syncCatalog(): Promise<SyncCatalogResult> {
  return apiRequest<SyncCatalogResult>("/api/catalog/sync", { method: "POST" })
}
