import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { AlertCircle, CreditCard, LogIn, X } from "lucide-react"
import { getHeroBanners } from "@/services/heroApi"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import type { HeroBanner } from "@/types/hero"
import { CarouselDots } from "./CarouselDots"
import { CarouselNavigation } from "./CarouselNavigation"
import { HeroSkeleton } from "./HeroSkeleton"
import { HeroSlide } from "./HeroSlide"
import { useCarousel } from "./hooks/useCarousel"

type Gate = "auth" | "deposit" | null

/** `compact` drops the top padding meant to clear the landing page's fixed header — use it wherever the carousel sits in normal document flow instead (e.g. the dashboard). */
export const HeroCarousel = memo(function HeroCarousel({ compact = false }: { compact?: boolean } = {}) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const walletQuery = useWallet()
  const [gate, setGate] = useState<Gate>(null)
  const [isInView, setIsInView] = useState(false)
  const [sectionNode, setSectionNode] = useState<HTMLElement | null>(null)

  const bannersQuery = useQuery({
    queryKey: ["home", "hero-banners"],
    queryFn: getHeroBanners,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const banners = useMemo(() => (bannersQuery.data ?? []).slice(0, 10), [bannersQuery.data])
  const carousel = useCarousel({ count: banners.length, enabled: isInView })

  useEffect(() => {
    if (!sectionNode) return
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry?.isIntersecting ?? false), { threshold: 0.35 })
    observer.observe(sectionNode)
    return () => observer.disconnect()
  }, [sectionNode])

  useEffect(() => {
    if (banners.length === 0) return
    const urls = [banners[carousel.activeIndex], banners[(carousel.activeIndex + 1) % banners.length]]
      .map((banner) => banner?.backgroundImage)
      .filter(Boolean)
    const images = urls.map((url) => {
      const image = new Image()
      image.src = url
      return image
    })
    return () => {
      images.forEach((image) => {
        image.onload = null
      })
    }
  }, [banners, carousel.activeIndex])

  const handlePlay = useCallback(
    (banner: HeroBanner) => {
      if (!isAuthenticated) {
        setGate("auth")
        return
      }
      if ((walletQuery.data?.balance ?? 0) <= 0) {
        setGate("deposit")
        return
      }
      navigate({ to: "/game/$gameSlug", params: { gameSlug: banner.gameSlug } })
    },
    [isAuthenticated, navigate, walletQuery.data?.balance]
  )

  if (bannersQuery.isLoading) return <HeroSkeleton compact={compact} />

  if (bannersQuery.isError) {
    return (
      <section className={`w-full px-4 sm:px-6 lg:px-8 ${compact ? "" : "pt-40"}`} aria-label="Hero banners">
        <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded-[24px] border border-white/[.08] bg-[#0d0714] p-6 text-center text-white md:h-[520px]">
          <AlertCircle className="size-10 text-[#8B5CF6]" aria-hidden="true" />
          <p className="text-lg font-bold">Hero banners could not be loaded.</p>
          <button
            type="button"
            onClick={() => bannersQuery.refetch()}
            className="rounded-[14px] bg-(--brand-gold-bright) px-5 py-3 text-sm font-black text-(--brand-ink) outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      </section>
    )
  }

  return (
    <section ref={setSectionNode} className={`w-full px-4 sm:px-6 lg:px-8 ${compact ? "" : "pt-40"}`} aria-label="Featured games">
      <div
        tabIndex={0}
        className="group relative h-[420px] overflow-hidden rounded-[24px] border border-white/[.08] bg-(--brand-showcase-bg-1) shadow-[0_34px_100px_-52px_rgba(0,0,0,.92)] outline-none focus-visible:ring-2 focus-visible:ring-(--brand-gold-bright) md:h-[520px]"
        {...carousel.handlers}
      >
        {banners.map((banner, index) => (
          <HeroSlide key={banner.id} banner={banner} isActive={index === carousel.activeIndex} onPlay={handlePlay} />
        ))}
        <CarouselNavigation onPrevious={carousel.previous} onNext={carousel.next} />
        <CarouselDots count={banners.length} activeIndex={carousel.activeIndex} onSelect={carousel.goTo} />
      </div>
      {gate && <GateDialog gate={gate} onClose={() => setGate(null)} />}
    </section>
  )
})

function GateDialog({ gate, onClose }: { gate: Exclude<Gate, null>; onClose: () => void }) {
  const isAuth = gate === "auth"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="hero-gate-title">
      <div className="w-full max-w-lg rounded-[24px] border border-white/10 bg-(--brand-showcase-bg-2) p-7 text-white shadow-[0_30px_80px_-34px_rgba(0,0,0,.9)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-(--brand-gold-bright)/15 text-(--brand-gold-bright)">
            {isAuth ? <LogIn className="size-6.5" aria-hidden="true" /> : <CreditCard className="size-6.5" aria-hidden="true" />}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-full p-2 text-white/64 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-(--brand-gold-bright)">
            <X className="size-5.5" aria-hidden="true" />
          </button>
        </div>
        <h2 id="hero-gate-title" className="mt-6 text-2xl font-black leading-[1.15]">
          {isAuth ? "Login or register to play" : "Add balance to continue"}
        </h2>
        <p className="mt-4 text-sm leading-[1.55] text-white/72">
          {isAuth
            ? "Create your EXCHLOTUS account or sign in before starting a real-money game session."
            : "Your wallet balance is currently zero. Deposit funds before opening this game."}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {isAuth ? (
            <Link to="/login" className="inline-flex h-11 flex-1 items-center justify-center rounded-[14px] bg-(--brand-gold-bright) text-sm font-black text-(--brand-ink) outline-none focus-visible:ring-2 focus-visible:ring-white">
              Continue
            </Link>
          ) : (
            <Link to="/dashboard" className="inline-flex h-11 flex-1 items-center justify-center rounded-[14px] bg-(--brand-gold-bright) text-sm font-black text-(--brand-ink) outline-none focus-visible:ring-2 focus-visible:ring-white">
              Deposit
            </Link>
          )}
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-[14px] border border-white/10 bg-white/5 text-sm font-bold text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-(--brand-gold-bright)">
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
