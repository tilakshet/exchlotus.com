export interface Provider {
  id: string
  code: string
  name: string
  rtp: number | null
  syncedAt: string
}

export interface Category {
  id: string
  code: string
  name: string
  sortOrder: number
  createdAt: string
}

export interface Game {
  id: string
  gameId: string
  gameCode: string
  gameName: string
  providerId: string
  provider: Provider
  categoryId: string | null
  category: Category | null
  rtp: number | null
  bannerUrl: string | null
  syncedAt: string
}

export interface GameFilters {
  category?: string
  provider?: string
  search?: string
  /** Exact-id lookup for a known small set (favorites, recently played) — bypasses paging. */
  ids?: string[]
  page?: number
  pageSize?: number
}

export interface GamesPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface GamesPage {
  data: Game[]
  pagination: GamesPagination
}
