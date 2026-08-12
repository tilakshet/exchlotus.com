import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

/**
 * Floating bottom-right button, visible once you've scrolled a screen down.
 * Not a decorative/fake chat-widget mascot — an actual working control.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Back to top"
      className="landing-glow fixed right-5 bottom-5 z-40 flex size-12 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
      style={{ background: "var(--landing-gold)", color: "var(--landing-gold-fg)" }}
    >
      <ArrowUp className="size-6.5" aria-hidden="true" />
    </button>
  )
}
