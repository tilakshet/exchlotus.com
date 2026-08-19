import { motion } from "framer-motion"
import { useProviders } from "@/hooks/useProviders"
import { PROVIDER_LOGOS } from "@/data/providerLogos"

function ProviderCardSkeleton() {
  return <div className="mx-auto h-5 w-24 animate-pulse rounded-full bg-[color:var(--sb-content-alt)]" />
}

/** a-z0-9 only, lowercased — so "3 Oaks Gaming" and a real API name like "3Oaks Gaming" match regardless of spacing/case. */
function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

const LOGO_BY_NORMALIZED_NAME = new Map(PROVIDER_LOGOS.map((logo) => [normalize(logo.name), logo]))

/** Longest normalized name first, so a substring match below prefers the most specific logo (e.g. "Evolution WCX" over the shorter "Evolution WC" for a real name like "EvolutionWCX Live"). */
const LOGOS_BY_LENGTH_DESC = [...PROVIDER_LOGOS].sort((a, b) => normalize(b.name).length - normalize(a.name).length)

/**
 * Exact normalized match first; if the real API's provider name doesn't
 * exactly match our display name (e.g. their record is just "Evolution"
 * or "3Oaks" without the sub-brand suffix our logo file is named after),
 * fall back to a substring match in either direction. Real provider names
 * here are distinctive enough (see public/providers/) that this shouldn't
 * misfire, but it's a best-effort match, not a guaranteed one — there's no
 * id/code link between the live provider list and this static logo set.
 */
function findLogo(providerName: string) {
  const normalized = normalize(providerName)
  const exact = LOGO_BY_NORMALIZED_NAME.get(normalized)
  if (exact) return exact
  return LOGOS_BY_LENGTH_DESC.find((logo) => {
    const logoKey = normalize(logo.name)
    return normalized.includes(logoKey) || logoKey.includes(normalized)
  })
}

/**
 * All real, backend-synced providers (see useProviders()/GET
 * /api/catalog/providers) as a responsive grid. The live provider API has
 * no logo field at all (see data/providerLogos.ts), so this shows the real
 * logo artwork for the handful of providers we do have a file for
 * (name-matched, not id-matched — the static logo list has no relation to
 * the live provider ids), and falls back to the original plain-wordmark
 * treatment for every other real provider so the page still lists all of
 * them, not just the ones with art.
 */
export function ProvidersPage() {
  const { data: providers, isLoading, isError, refetch } = useProviders()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--sb-text-primary)]">Providers</h1>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          Unable to load providers.
          <button type="button" onClick={() => refetch()} className="min-h-11 font-medium underline">
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !isError && providers?.length === 0 && (
        <p className="text-sm text-[color:var(--sb-text-secondary)]">No providers available.</p>
      )}

      {!isLoading && !isError && providers && providers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {providers.map((provider, index) => {
            const logo = findLogo(provider.name)
            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.6) }}
                whileHover={{ y: -3 }}
                className={
                  logo
                    ? "flex items-center justify-center rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] px-4 py-8"
                    : "flex items-center justify-center px-3 py-6 text-center"
                }
              >
                {logo ? (
                  <img src={logo.src} alt={provider.name} loading="lazy" className="h-14 w-auto object-contain sm:h-16" />
                ) : (
                  <span className="cursor-default text-base font-black tracking-wide text-[color:var(--sb-text-primary)]/55 transition-colors duration-300 hover:text-[color:var(--sb-accent-gold)] sm:text-lg">
                    {provider.name}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
