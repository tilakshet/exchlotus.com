import { motion } from "framer-motion"
import { useProviders } from "@/hooks/useProviders"

function ProviderCardSkeleton() {
  return <div className="mx-auto h-5 w-24 animate-pulse rounded-full bg-[color:var(--sb-content-alt)]" />
}

/**
 * All real, backend-synced providers (see useProviders()/GET
 * /api/catalog/providers) as a responsive grid of plain wordmark names — no
 * card/border/logo, just the name with an entrance stagger + hover lift,
 * gated by prefers-reduced-motion via Framer Motion's own reduced-motion
 * handling (it disables transform/opacity animation automatically for
 * users with that preference).
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
          {providers.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.6) }}
              whileHover={{ y: -3 }}
              className="flex items-center justify-center px-3 py-6 text-center"
            >
              <span className="cursor-default text-base font-black tracking-wide text-[color:var(--sb-text-primary)]/55 transition-colors duration-300 hover:text-[color:var(--sb-accent-gold)] sm:text-lg">
                {provider.name}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
