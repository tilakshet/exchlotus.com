import { apiRequest } from "./http"
import type { Provider } from "@/types/catalog"

export function getProviders(): Promise<Provider[]> {
  return apiRequest<Provider[]>("/api/catalog/providers")
}
