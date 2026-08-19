import type { ReactNode } from "react"

interface PageHeroProps {
  eyebrow: string
  title: string
  subtitle?: string
  description?: string
  children?: ReactNode
}

/**
 * Consistent hero banner for every static info page — gold eyebrow, large
 * title, optional parrot-green subtitle line, muted description. Subtle
 * radial gold/green glows behind the text, no full-bleed gradient wash.
 */
export function PageHero({ eyebrow, title, subtitle, description, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-(--landing-border) px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 20% 0%, color-mix(in srgb, var(--landing-gold) 14%, transparent), transparent 60%), radial-gradient(ellipse 50% 50% at 85% 20%, color-mix(in srgb, var(--landing-emerald) 14%, transparent), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-widest text-(--landing-gold-text) uppercase">{eyebrow}</span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-(--landing-text-primary) sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-lg font-bold text-(--brand-green-text)">{subtitle}</p>}
        {description && <p className="mx-auto mt-4 max-w-2xl text-base text-(--landing-text-secondary) sm:text-lg">{description}</p>}
        {children}
      </div>
    </section>
  )
}
