import { useMemo, useRef, useState, type MouseEvent } from "react"
import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  Zap,
  Headset,
  BadgeCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Radio,
  Flame,
} from "lucide-react"
import { liveStats } from "@/data/landing"

const trustSignals = [
  { icon: ShieldCheck, label: "Licensed & certified" },
  { icon: Zap, label: "Instant withdrawals" },
  { icon: Headset, label: "24/7 support" },
  { icon: BadgeCheck, label: "Certified providers" },
]

const depositBadges = [
  { icon: ArrowDownToLine, label: "Instant Deposits" },
  { icon: ArrowUpFromLine, label: "Fast Withdrawals" },
]

const particles = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: (i * 41 + 7) % 100,
  top: (i * 29 + 11) % 100,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.6,
  duration: 4 + (i % 5),
}))

/**
 * Full-screen premium hero. Left: headline, CTAs, trust + deposit/withdraw
 * badges. Right: a scaled-up version of the login page's 3D-tilt card —
 * real stats and iconography, not a photorealistic avatar (outside what
 * can be generated here) or literal chip/card/dice imagery. A soft single-
 * hue glow and a restrained particle field sit behind everything, both
 * responding to pointer position for a subtle parallax layer.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const memoParticles = useMemo(() => particles, [])

  const playersStat = liveStats.find((s) => s.id === "players")
  const matchesStat = liveStats.find((s) => s.id === "matches")

  function handleMouseMove(e: MouseEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    setParallax({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    })
  }

  function handleMouseLeave() {
    setParallax({ x: 0, y: 0 })
  }

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-label="Introduction"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-hidden border-b border-(--landing-border) pt-28 pb-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 25% 20%, color-mix(in srgb, var(--landing-gold) 16%, transparent), transparent), radial-gradient(ellipse 55% 50% at 90% 75%, color-mix(in srgb, var(--landing-gold) 10%, transparent), transparent)",
          transform: `translate(${parallax.x * 24}px, ${parallax.y * 24}px)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${parallax.x * 12}px, ${parallax.y * 12}px)` }}
      >
        {memoParticles.map((p) => (
          <span
            key={p.id}
            className="landing-float absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background: "var(--landing-gold)",
              opacity: 0.35,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="landing-glass inline-flex items-center gap-2 rounded-(--landing-radius-full) px-3 py-1 text-xs font-medium text-(--landing-text-secondary)">
            <ShieldCheck className="size-4.5 text-(--landing-gold)" aria-hidden="true" />
            Licensed &amp; Certified Platform
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-(--landing-text-primary) sm:text-5xl lg:text-6xl">
            Where every game
            <br />
            feels like <span className="text-(--landing-gold-text)">high stakes</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-(--landing-text-secondary) sm:text-lg">
            Real-time odds, certified game providers, and withdrawals that land in minutes, not days.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="landing-glow rounded-(--landing-radius-sm) bg-(--landing-gold) px-6 py-3 text-sm font-semibold text-(--landing-gold-fg) outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
            >
              Register &amp; Claim Bonus
            </Link>
            <a
              href="#trending"
              className="landing-glass rounded-(--landing-radius-sm) px-6 py-3 text-sm font-semibold text-(--landing-text-primary) outline-none transition-colors hover:bg-(--landing-hover-tint) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            >
              Explore Games
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {depositBadges.map((badge) => {
              const Icon = badge.icon
              return (
                <span
                  key={badge.label}
                  className="landing-glass inline-flex items-center gap-1.5 rounded-(--landing-radius-full) px-3 py-1.5 text-xs font-semibold text-(--landing-text-primary)"
                >
                  <Icon className="size-4.5 text-(--landing-emerald)" aria-hidden="true" />
                  {badge.label}
                </span>
              )
            })}
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-(--landing-border) pt-6 sm:grid-cols-4">
            {trustSignals.map((signal) => {
              const Icon = signal.icon
              return (
                <div key={signal.label} className="flex items-center gap-2">
                  <Icon className="size-4.5 shrink-0 text-(--landing-gold)" aria-hidden="true" />
                  <dt className="text-xs text-(--landing-text-secondary) sm:text-sm">{signal.label}</dt>
                </div>
              )
            })}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="relative hidden lg:block"
          style={{ perspective: "1200px" }}
        >
          <div
            className="landing-card landing-glow relative rounded-(--landing-radius-lg) p-8 transition-transform duration-300 ease-out"
            style={{
              transform: `rotateX(${parallax.y * -6}deg) rotateY(${parallax.x * 6}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="flex size-16 items-center justify-center rounded-full"
              style={{ background: "var(--landing-gold)", color: "var(--landing-gold-fg)", transform: "translateZ(36px)" }}
            >
              <Flame className="size-8.75" aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm font-bold uppercase tracking-widest text-(--landing-text-muted)" style={{ transform: "translateZ(20px)" }}>
              Live right now
            </p>
            <p className="mt-1 text-5xl font-black tracking-tight text-(--landing-text-primary)" style={{ transform: "translateZ(20px)" }}>
              {playersStat ? `${playersStat.value.toLocaleString("en-IN")}+` : ""}
            </p>
            <p className="mt-2 text-sm font-medium text-(--landing-text-secondary)" style={{ transform: "translateZ(12px)" }}>
              players across sportsbook, live casino, and slots
            </p>
          </div>

          <div
            className="landing-glass landing-float absolute -left-6 top-8 flex items-center gap-2.5 rounded-(--landing-radius-md) px-4 py-3"
            style={{ animationDelay: "0s" }}
          >
            <Users className="size-4.5 text-(--landing-gold)" aria-hidden="true" />
            <span className="text-xs font-semibold text-(--landing-text-primary)">
              {playersStat ? `${playersStat.value.toLocaleString("en-IN")}+ online` : "Players online"}
            </span>
          </div>

          <div
            className="landing-glass landing-float absolute -right-4 top-1/2 flex items-center gap-2.5 rounded-(--landing-radius-md) px-4 py-3"
            style={{ animationDelay: "1.2s" }}
          >
            <Radio className="size-4.5 text-red-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-(--landing-text-primary)">
              {matchesStat ? `${matchesStat.value} live matches` : "Live matches"}
            </span>
          </div>

          <div
            className="landing-glass landing-float absolute -bottom-4 left-10 flex items-center gap-2.5 rounded-(--landing-radius-md) px-4 py-3"
            style={{ animationDelay: "2.4s" }}
          >
            <BadgeCheck className="size-4.5 text-(--landing-emerald)" aria-hidden="true" />
            <span className="text-xs font-semibold text-(--landing-text-primary)">Certified providers</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
