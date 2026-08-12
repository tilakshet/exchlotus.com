import { createFileRoute, redirect } from "@tanstack/react-router"

/**
 * Superseded by /game/$gameSlug, which resolves against the real backend
 * catalog (useGames) instead of static fixture data. Kept as a redirect
 * so any old /dashboard/games/:slug link still lands on a working page.
 */
export const Route = createFileRoute("/dashboard/games/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/game/$gameSlug", params: { gameSlug: params.slug } })
  },
})
