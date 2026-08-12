import { memo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CarouselNavigationProps {
  onPrevious: () => void
  onNext: () => void
}

const navButton =
  "absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white opacity-0 shadow-[0_0_32px_-10px_rgba(232,199,102,.9)] backdrop-blur-xl transition duration-200 hover:border-(--brand-gold-bright)/70 hover:bg-(--brand-gold-bright)/20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-(--brand-gold-bright) md:flex group-hover:opacity-100"

export const CarouselNavigation = memo(function CarouselNavigation({ onPrevious, onNext }: CarouselNavigationProps) {
  return (
    <>
      <button type="button" onClick={onPrevious} aria-label="Previous hero banner" className={cn(navButton, "left-5")}>
        <ChevronLeft className="size-7.5" aria-hidden="true" />
      </button>
      <button type="button" onClick={onNext} aria-label="Next hero banner" className={cn(navButton, "right-5")}>
        <ChevronRight className="size-7.5" aria-hidden="true" />
      </button>
    </>
  )
})
