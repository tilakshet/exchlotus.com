import { motion } from "framer-motion"
import { BadgeCheck } from "lucide-react"
import { useProviders } from "@/hooks/useProviders"

function ProviderCardSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)]" />
  )
}

/**
 * All real, backend-synced providers (see useProviders()/GET
 * /api/catalog/providers) as a responsive grid of animated cards — entrance
 * stagger + hover lift, gated by prefers-reduced-motion via Framer Motion's
 * own reduced-motion handling (it disables transform/opacity animation
 * automatically for users with that preference).
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
              whileHover={{ y: -4 }}
              className="flex flex-col items-center gap-3 rounded-[var(--sb-radius-lg)] border border-[color:var(--sb-border)] bg-[color:var(--sb-content-alt)] p-5 text-center transition-colors hover:border-[color:var(--sb-accent-gold)]/40"
            >
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-black"
                style={{ background: "var(--sb-accent-gold)", color: "var(--sb-accent-gold-fg)" }}
              >
                {provider.name.charAt(0)}
              </span>
              <span className="text-sm font-bold text-[color:var(--sb-text-primary)]">{provider.name}</span>
              {provider.rtp != null && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  {provider.rtp}% avg RTP
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
