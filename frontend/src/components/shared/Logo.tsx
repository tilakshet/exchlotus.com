import logoDarkImg from "@/assets/logo-dark.png"

/**
 * logo.png's navy "EXCH" text nearly disappears on a dark surface —
 * logo-dark.png is a pixel-remapped variant, same transparent background
 * and unchanged blue lotus/"LOTUS" wordmark, "EXCH" remapped to a light
 * neutral. Used unconditionally now that the whole app is one dark
 * cornflower-blue theme.
 */
export function Logo({ heightClass = "h-14" }: { heightClass?: string }) {
  return (
    <span className="inline-flex items-center">
      <img src={logoDarkImg} alt="exchlotus — play, win, repeat" className={`exchlotus-logo ${heightClass}`} />
    </span>
  )
}
