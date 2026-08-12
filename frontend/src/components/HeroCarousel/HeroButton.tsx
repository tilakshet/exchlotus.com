import { memo, type ButtonHTMLAttributes, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export const HeroButton = memo(function HeroButton({ children, className, ...props }: HeroButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "landing-shine group inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-(--brand-gold-bright) px-5 text-sm font-black text-(--brand-ink) shadow-[0_16px_38px_-18px_rgba(232,199,102,.95)] outline-none transition hover:translate-y-[-1px] hover:shadow-[0_18px_46px_-16px_rgba(232,199,102,1)] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-(--brand-showcase-bg-1)",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="size-5.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  )
})
