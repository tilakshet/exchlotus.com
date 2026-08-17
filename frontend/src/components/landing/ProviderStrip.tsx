import { useProviders } from "@/hooks/useProviders"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"

function ProviderStripSkeleton() {
  return (
    <div className="flex items-center gap-10 px-1 py-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-6 w-28 shrink-0 animate-pulse rounded-full bg-(--landing-bg-3)" />
      ))}
    </div>
  )
}

/**
 * Real providers from the backend catalog, shown as a plain transparent
 * wordmark strip (no cards/borders/badges, no logo assets — consistent with
 * the rest of this codebase's "no external art" approach). Names sit
 * dimmed until hovered, and the row fades out at both edges via a mask so
 * it reads like a scrolling "as seen on" strip rather than a boxed list.
 */
export function ProviderStrip() {
  const { data: providers, isLoading, isError } = useProviders()

  if (isError) return null

  return (
    <SectionContainer ariaLabel="Game providers" className="py-8!">
      {isLoading && <ProviderStripSkeleton />}
      {!isLoading && providers && providers.length > 0 && (
        <ul className="scrollbar-none flex items-center gap-10 overflow-x-auto px-1 py-3 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          {providers.map((provider) => (
            <li key={provider.id} className="shrink-0">
              <span className="block cursor-default text-xl font-black tracking-wide whitespace-nowrap text-(--landing-text-primary)/45 transition-all duration-300 hover:scale-105 hover:text-(--landing-gold) sm:text-2xl">
                {provider.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionContainer>
  )
}
