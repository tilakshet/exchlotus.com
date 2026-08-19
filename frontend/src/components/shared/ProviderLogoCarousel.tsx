import { PROVIDER_LOGOS } from "@/data/providerLogos"

/**
 * Auto-scrolling strip of real provider wordmarks, shown directly under
 * the hero on both the landing page (routes/index.tsx) and the dashboard
 * home (routes/dashboard.index.tsx) — one shared component for both, using
 * the --sb-* token set since it's value-identical to --landing-* (see
 * index.css's brand palette block), the same "one component, two surfaces"
 * pattern BottomNavBar.tsx already uses. Marquee via the existing
 * .landing-marquee-x utility (pauses on hover/focus, respects
 * prefers-reduced-motion — both already handled globally in index.css),
 * but with its own animation-duration instead of that class's fixed 20s:
 * this list has grown from 7 to 40+ logos, so a fixed duration means more
 * distance covered in the same time as logos are added — it keeps
 * visibly speeding up. Scaling duration with the logo count keeps a
 * constant, readable per-logo pace regardless of how many are added later.
 * The list is rendered twice for the seamless loop; the second copy is
 * aria-hidden so a screen reader hears each provider name once, not twice.
 */
const SECONDS_PER_LOGO = 3
const MARQUEE_DURATION = `${PROVIDER_LOGOS.length * SECONDS_PER_LOGO}s`

export function ProviderLogoCarousel() {
  return (
    <div className="overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <ul
        className="landing-marquee-x flex w-max items-center gap-6 sm:gap-10"
        style={{ animationDuration: MARQUEE_DURATION }}
      >
        {PROVIDER_LOGOS.map((logo) => (
          <li key={logo.name} className="flex h-12 shrink-0 items-center sm:h-14">
            <img
              src={logo.src}
              alt={logo.name}
              loading="lazy"
              className="h-full w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </li>
        ))}
        {PROVIDER_LOGOS.map((logo) => (
          <li key={`${logo.name}-dup`} aria-hidden="true" className="flex h-12 shrink-0 items-center sm:h-14">
            <img
              src={logo.src}
              alt=""
              loading="lazy"
              className="h-full w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
