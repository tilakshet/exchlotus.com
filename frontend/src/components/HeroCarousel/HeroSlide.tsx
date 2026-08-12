import { memo, useState } from "react"
import { motion } from "framer-motion"
import type { HeroBanner } from "@/types/hero"
import { HeroButton } from "./HeroButton"

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
        // Pinned hero art (frontend/public/hero/*.jpg) is sized for this —
        // full-bleed cover, no blurred-backdrop crutch needed like the old
        // provider-thumbnail-sourced images required.
        <motion.img
          src={banner.backgroundImage}
          alt=""
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 size-full object-cover"
          animate={{ scale: isActive ? 1.06 : 1 }}
          transition={{ duration: 6, ease: "easeOut" }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: FALLBACK_BACKGROUND }} />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,23,18,.65)_0%,rgba(14,23,18,.15)_38%,transparent_62%)]" />

      <div className="relative z-10 flex h-full flex-col justify-end p-6 pb-16 sm:p-8 sm:pb-18 md:p-10 md:pb-20 lg:p-12">
        <motion.div
          initial={false}
          animate={isActive ? "show" : "hide"}
          variants={{ show: { opacity: 1, x: 0 }, hide: { opacity: 0, x: -14 } }}
          transition={{ duration: 0.5, delay: isActive ? 0.12 : 0 }}
        >
          <HeroButton onClick={() => onPlay(banner)}>{banner.ctaText}</HeroButton>
        </motion.div>
      </div>
    </motion.article>
  )
})
