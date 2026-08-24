import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

export type AvatarGender = "MALE" | "FEMALE" | "OTHER"

interface UserAvatarProps {
  /** Tailwind size utility, e.g. "size-14" — controls both the circle and the icon inside it. */
  sizeClassName: string
  background: string
  color: string
  className?: string
  /** "OTHER", unset, or not yet loaded (profile still fetching) all render the plain neutral icon mark — no illustration to guess from. */
  gender?: AvatarGender
}

const MALE_PALETTE = { skin: "#E8B48C", hair: "#2E2118", cloth: "#3B6FE0", mouth: "#8A5A3D" }
const FEMALE_PALETTE = { skin: "#E8B48C", hair: "#5B3A29", cloth: "#E0568C", mouth: "#8A5A3D" }

/**
 * Illustrated bust — flat-design face, hair, and shoulders filling the
 * whole circle (not a small badge/icon-on-a-flat-color mark), same idea as
 * Slack/Discord/Duolingo default avatars. There's no photo upload feature
 * and no image-generation tool available to produce real photos, so this
 * is hand-drawn SVG rather than a photo. The `rect` at the bottom of the
 * stack is a full-bleed background wash (doubles as the "shirt" color) so
 * there's never a gap showing the plain flat-color mark peeking through
 * around the hand-placed face/hair shapes above it.
 */
function IllustratedAvatar({ gender }: { gender: "MALE" | "FEMALE" }) {
  const p = gender === "MALE" ? MALE_PALETTE : FEMALE_PALETTE
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
      <rect width="64" height="64" fill={p.cloth} />
      <circle cx="32" cy="28" r="14" fill={p.skin} />
      {gender === "FEMALE" && (
        <>
          <path d="M17 18 Q12 34 17 52 L25 52 Q20 34 22 20 Z" fill={p.hair} />
          <path d="M47 18 Q52 34 47 52 L39 52 Q44 34 42 20 Z" fill={p.hair} />
        </>
      )}
      <ellipse cx="32" cy="16" rx="15" ry="9" fill={p.hair} />
      <ellipse cx="26" cy="27" rx="1.8" ry="2.4" fill="#2b2b2b" />
      <ellipse cx="38" cy="27" rx="1.8" ry="2.4" fill="#2b2b2b" />
      <path d="M25 34 Q32 38 39 34" stroke={p.mouth} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Shared avatar mark, used everywhere a user avatar appears (account
 * sidebar, dashboard/landing profile menus) instead of a single-letter
 * initial. Accounts with a gender on file get the full IllustratedAvatar
 * bust; accounts without one (not yet set, or profile still loading) fall
 * back to the plain neutral person icon on a flat brand-colored circle —
 * deliberately not guessing an illustration for an unknown gender.
 */
export function UserAvatar({ sizeClassName, background, color, className, gender }: UserAvatarProps) {
  if (gender === "MALE" || gender === "FEMALE") {
    return (
      <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full", sizeClassName, className)}>
        <IllustratedAvatar gender={gender} />
      </span>
    )
  }

  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full", sizeClassName, className)} style={{ background, color }}>
      <UserRound className="size-[62%]" strokeWidth={2.4} fill={color} fillOpacity={0.16} />
    </span>
  )
}
