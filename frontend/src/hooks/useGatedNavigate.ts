import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/hooks/useAuth"

/**
 * Shared "click a game/dashboard link on the public landing page" behavior:
 * logged in → go straight there. Logged out → to /login, remembering where
 * to send them back to once they sign in. Used by every landing-page click
 * target that leads into the authenticated app (Trending Games launch,
 * Sports Highlights cards, etc.) so the gate can't be forgotten on a new one.
 */
export function useGatedNavigate() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  return (destination: string) => {
    if (isAuthenticated) {
      // Destination is always a route built from a known path (e.g.
      // `/dashboard/games/${slug}`), not user input — the router's route
      // registry can't type-check a dynamically-built string, hence the cast.
      navigate({ to: destination as "/dashboard" })
    } else {
      navigate({ to: "/login", search: { redirect: destination } })
    }
  }
}
