import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "exchlotus.favoriteGames"

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/**
 * There's no backend endpoint for favorites — this is local-only (per
 * browser, not synced across devices) until one exists. Flagged here
 * rather than silently pretending it's a real account-level feature.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  const isFavorite = useCallback((gameId: string) => favorites.includes(gameId), [favorites])

  const toggleFavorite = useCallback((gameId: string) => {
    setFavorites((prev) => (prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]))
  }, [])

  return { favorites, isFavorite, toggleFavorite }
}
