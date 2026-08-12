import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
  as?: "div" | "li"
}

/**
 * The base card surface used across Featured Categories, Trending Games,
 * Promotions, etc. — flat background, real 1px border, border brightens on
 * hover/focus. No blur, no gradient border, no glow.
 */
export function Card({ children, className = "", as = "div" }: CardProps) {
  const Comp = as
  return (
    <Comp className={`landing-card landing-card-hover group rounded-(--landing-radius-lg) p-6 ${className}`}>
      {children}
    </Comp>
  )
}
