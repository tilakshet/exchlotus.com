import { memo, useState } from "react"
import { motion } from "framer-motion"
import type { HeroBanner } from "@/types/hero"

interface HeroSlideProps {
  banner: HeroBanner
  isActive: boolean
  onPlay: (banner: HeroBanner) => void
}

/** Same gradient fallback used when a banner has no real image, minus the theme-matching artwork — just a plain dark backdrop so the CTA stays legible. */
const FALLBACK_BACKGROUND = "linear-gradient(135deg, #2a3f30, #1c2e24 48%, #0e1712)"

export const HeroSlide = memo(function HeroSlide({ banner, isActive, onPlay }: HeroSlideProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <motion.article
      aria-hidden={!isActive}
      className="absolute inset-0"
      initial={false}
      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.015, filter: isActive ? "blur(0px)" : "blur(10px)" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {banner.backgroundImage && !imageFailed ? (
        // The carousel box is sized to match the promo art's own aspect
        // ratio at every breakpoint (see HeroCarousel.tsx), so object-cover
        // fills it with no letterbox/pillarbox bars on any screen size and
        // no crop for images at that ratio.
        <img
          src={banner.backgroundImage}
          alt=""
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: FALLBACK_BACKGROUND }} />
      )}

      {/* The banner art already carries its own CTA button (see
          public/promotion_banner/*.png) — no second, redundant button drawn
          on top. The whole slide stays clickable instead so tapping the
          image (including its own baked-in button) still navigates.
          tabIndex/pointer-events are gated on isActive since every slide is
          stacked absolute inset-0 — only the visible one should be
          reachable by click or keyboard. */}
      <button
        type="button"
        aria-label={banner.ctaText}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onPlay(banner)}
        className={`absolute inset-0 z-10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-gold-bright) ${isActive ? "" : "pointer-events-none"}`}
      />
    </motion.article>
  )
})
