export function HeroSkeleton({ compact = false }: { compact?: boolean } = {}) {
  return (
    <section className={`w-full px-4 sm:px-6 lg:px-8 ${compact ? "" : "pt-40"}`} aria-label="Loading hero banners">
      <div className="relative h-[420px] overflow-hidden rounded-[24px] border border-white/[.08] bg-[#0d0714] shadow-[0_32px_90px_-52px_rgba(0,0,0,.9)] md:h-[520px]">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#0a1712_0%,#221934_38%,#173726_48%,#221934_58%,#0a1712_100%)] bg-[length:220%_100%]" />
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(circle_at_72%_42%,rgba(139,92,246,.18),transparent_32%)]" />
        <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-10 lg:p-12">
          <div className="h-7 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 h-12 w-3/4 max-w-xl animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-4 h-5 w-2/3 max-w-md animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-12 w-36 animate-pulse rounded-[14px] bg-(--brand-gold-bright)/40" />
        </div>
      </div>
    </section>
  )
}
