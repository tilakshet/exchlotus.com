import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

/**
 * Segmented dark/light switch — moon on a filled dark segment, sun on a
 * filled orange segment, whichever is active. Persists via useTheme().
 * Shared across LandingHeader, the login page, and the dashboard's
 * TopNavbar — one implementation instead of three copies. Always styled
 * off the `--landing-*` tokens: they and the dashboard's `--sb-*` tokens
 * carry identical values in both themes, so this reads correctly whether
 * it's rendered inside `.landing-theme` or `.dashboard-shell`.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-1 rounded-full border border-(--landing-border-strong) bg-(--landing-glass) p-1 shadow-token-2 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => theme !== "dark" && toggle()}
        aria-pressed={theme === "dark"}
        aria-label="Dark mode"
        className="flex size-9 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--landing-gold) sm:size-13"
        style={{ background: theme === "dark" ? "color-mix(in srgb, var(--landing-gold) 16%, var(--landing-bg-1))" : "transparent" }}
      >
        <Moon
          className="size-5.5 sm:size-9"
          style={{ color: "var(--landing-gold)" }}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={() => theme !== "light" && toggle()}
        aria-pressed={theme === "light"}
        aria-label="Light mode"
        className="flex size-9 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--landing-gold) sm:size-13"
        style={{ background: theme === "light" ? "color-mix(in srgb, var(--landing-gold) 18%, transparent)" : "transparent" }}
      >
        <Sun
          className="size-5.5 sm:size-9"
          style={{ color: "var(--landing-gold)" }}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
