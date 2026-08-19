import { useState, type FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"

/**
 * Desktop-only (≥1024px) navbar search — submits to /dashboard/search,
 * which is reachable without a session same as the rest of /dashboard (see
 * dashboard.tsx). Shared between LandingHeader and TopNavbar so both
 * navbars search the same real catalog the same way. Hidden below `lg:`
 * entirely (icon included) — mobile users search from BottomNavBar's
 * catalog sections instead, not a cramped navbar field.
 */
export function NavSearchBar() {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate({ to: "/dashboard/search", search: { q } })
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="hidden min-w-0 max-w-56 flex-1 items-center gap-2 rounded-(--landing-radius-full) border border-(--landing-border) bg-(--landing-bg-2) px-3.5 py-2 text-(--landing-text-primary) focus-within:border-(--landing-gold) lg:flex"
    >
      <Search className="size-5 shrink-0 text-(--landing-text-secondary)" aria-hidden="true" />
      <label htmlFor="nav-search" className="sr-only">
        Search games
      </label>
      <input
        id="nav-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search games…"
        className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-(--landing-text-muted)"
      />
    </form>
  )
}
