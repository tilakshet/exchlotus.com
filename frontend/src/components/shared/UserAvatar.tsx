import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  /** Tailwind size utility, e.g. "size-14" — controls both the circle and the icon inside it. */
  sizeClassName: string
  background: string
  color: string
  className?: string
}

/**
 * Shared avatar mark — a filled person icon on a brand-colored circle,
 * used everywhere a user avatar appears (account sidebar, dashboard/landing
 * profile menus) instead of a single-letter initial. There's no photo
 * upload feature/backend, so this is an illustrated placeholder rather
 * than a real profile photo — consistent for every account, not a fake
 * per-user image.
 */
export function UserAvatar({ sizeClassName, background, color, className }: UserAvatarProps) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full", sizeClassName, className)} style={{ background, color }}>
      <UserRound className="size-[62%]" strokeWidth={2.4} fill={color} fillOpacity={0.16} />
    </span>
  )
}
