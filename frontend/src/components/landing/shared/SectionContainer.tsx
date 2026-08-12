import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface SectionContainerProps {
  id?: string
  className?: string
  children: ReactNode
  /** Landmark label for screen readers when the section has no visible heading id to reference. */
  ariaLabel?: string
}

/**
 * Shared wrapper for every landing section: consistent max-width/padding and
 * a fade-up-on-scroll entrance (guidelines: "fade-in sections"). Animates
 * once per section (`viewport={{ once: true }}`) so re-scrolling past a
 * section doesn't replay the animation and distract from actual content.
 */
export function SectionContainer({ id, className = "", children, ariaLabel }: SectionContainerProps) {
  return (
    <motion.section
      id={id}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full px-4 py-16 sm:px-6 md:py-24 lg:px-8 ${className}`}
    >
      {children}
    </motion.section>
  )
}
