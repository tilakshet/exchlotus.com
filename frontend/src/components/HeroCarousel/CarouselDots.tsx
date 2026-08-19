import { memo } from "react"
import { motion } from "framer-motion"

interface CarouselDotsProps {
  count: number
  activeIndex: number
  onSelect: (index: number) => void
}

export const CarouselDots = memo(function CarouselDots({ count, activeIndex, onSelect }: CarouselDotsProps) {
  return (
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2" role="tablist" aria-label="Hero banners">
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === activeIndex
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Show banner ${index + 1}`}
            onClick={() => onSelect(index)}
            className="flex h-5 items-center rounded-full px-1 outline-none focus-visible:ring-2 focus-visible:ring-(--brand-gold-bright)"
          >
            <motion.span
              className="block h-2 rounded-full"
              animate={{
                // Mirrors --brand-gold-bright's value — framer-motion's
                // animate prop needs a literal color, not a CSS var().
                width: isActive ? 28 : 8,
                backgroundColor: isActive ? "#357f0f" : "rgba(255,255,255,.34)",
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </button>
        )
      })}
    </div>
  )
})
