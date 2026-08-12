export function SectionHeading({ eyebrow, title, description, center = false }: { eyebrow: string; title: string; description?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-widest text-(--landing-gold-text)">{eyebrow}</span>
      <h2 className="mt-2 text-3xl font-bold text-[color:var(--landing-text-primary)] sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-[color:var(--landing-text-secondary)]">{description}</p>}
    </div>
  )
}
