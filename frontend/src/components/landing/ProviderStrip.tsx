import { BadgeCheck } from "lucide-react"
import { useProviders } from "@/hooks/useProviders"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"

function ProviderStripSkeleton() {
  return (
    <div className="flex gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 w-36 shrink-0 animate-pulse rounded-(--landing-radius-md) bg-(--landing-bg-3)" />
      ))}
    </div>
  )
}

/** Real providers from the backend catalog — text wordmarks, no logo assets (consistent with the rest of this codebase's "no external art" approach). */
export function ProviderStrip() {
  const { data: providers, isLoading, isError } = useProviders()

  if (isError) return null

  return (
    <SectionContainer ariaLabel="Game providers" className="py-8!">
      {isLoading && <ProviderStripSkeleton />}
      {!isLoading && providers && providers.length > 0 && (
        <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="landing-card landing-card-hover group flex shrink-0 items-center gap-3 rounded-(--landing-radius-md) px-5 py-4"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black transition-transform duration-300 group-hover:scale-110"
                style={{ background: "var(--landing-gold)", color: "var(--landing-gold-fg)" }}
              >
                {provider.name.charAt(0)}
              </span>
              <span className="text-left">
                <span className="block text-base font-black tracking-tight text-(--landing-text-primary)">{provider.name}</span>
                {provider.rtp != null && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-(--landing-emerald)">
                    <BadgeCheck className="size-4.5" aria-hidden="true" />
                    {provider.rtp}% avg RTP
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionContainer>
  )
}
