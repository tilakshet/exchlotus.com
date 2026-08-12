import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent, TouchEvent } from "react"

interface CarouselOptions {
  count: number
  intervalMs?: number
  enabled?: boolean
}

export function useCarousel({ count, intervalMs = 5000, enabled = true }: CarouselOptions) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback(
    (index: number) => {
      if (count <= 0) return
      setActiveIndex(((index % count) + count) % count)
    },
    [count]
  )

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])
  const previous = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])

  useEffect(() => {
    if (!enabled || isPaused || count <= 1) return
    const id = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % count)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [count, enabled, intervalMs, isPaused])

  useEffect(() => {
    if (activeIndex >= count) setActiveIndex(0)
  }, [activeIndex, count])

  const handlers = useMemo(
    () => ({
      onMouseEnter: () => setIsPaused(true),
      onMouseLeave: () => setIsPaused(false),
      onFocus: () => setIsPaused(true),
      onBlur: () => setIsPaused(false),
      onTouchStart: (event: TouchEvent) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      },
      onTouchEnd: (event: TouchEvent) => {
        const startX = touchStartX.current
        touchStartX.current = null
        if (startX === null) return
        const distance = startX - (event.changedTouches[0]?.clientX ?? startX)
        if (Math.abs(distance) < 40) return
        if (distance > 0) next()
        else previous()
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") {
          event.preventDefault()
          next()
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          previous()
        }
      },
    }),
    [next, previous]
  )

  return { activeIndex, goTo, next, previous, isPaused, handlers }
}
