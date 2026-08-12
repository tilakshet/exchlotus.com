import { useTheme } from "@/hooks/useTheme"
import logoImg from "@/assets/logo.png"
import logoDarkImg from "@/assets/logo-dark.png"

/**
 * The logo artwork (src/assets/logo.png) bakes in its own fixed navy "EXCH"
 * text, designed to sit on a light surface — on a dark surface that navy
 * nearly disappears. Rather than mask that with an opaque backing chip (a
 * white box clashing against the theme), logo-dark.png is a pixel-remapped
 * variant with the same transparent background and unchanged blue lotus/
 * "LOTUS" wordmark, just with "EXCH" remapped to a light neutral — so the
 * mark stays truly transparent and legible with no backing surface at all.
 *
 * By default the variant follows the page's light/dark theme toggle. Pass
 * `surface="dark"` when the logo sits on a surface that's dark regardless
 * of that toggle (e.g. the permanently dark-green TopNavbar/Footer) — the
 * navy "EXCH" would otherwise vanish against it even in light mode, since
 * the theme toggle and the surface's actual color aren't the same thing
 * there.
 */
export function Logo({ heightClass = "h-14", surface = "auto" }: { heightClass?: string; surface?: "auto" | "dark" }) {
  const { theme } = useTheme()
  const useDarkVariant = surface === "dark" || theme === "dark"

  return (
    <span className="inline-flex items-center">
      <img
        src={useDarkVariant ? logoDarkImg : logoImg}
        alt="exchlotus — play, win, repeat"
        className={`exchlotus-logo ${heightClass} ${surface === "dark" ? "exchlotus-logo--forced-dark" : ""}`}
      />
    </span>
  )
}
