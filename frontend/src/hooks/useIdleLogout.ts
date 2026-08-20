import { useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "./useAuth"

const IDLE_TIMEOUT_MS = 10 * 60 * 1000

// A leading-edge throttle on the reset itself, not the events — mousemove
// alone can fire 50-100x/sec, and clearTimeout+setTimeout on every one of
// those is pure waste when all that matters is "was there activity in the
// last second." Worst case the 10-minute timer fires up to ~1s late, which
// is imperceptible for an idle *logout*, unlike a race-sensitive timer.
const RESET_THROTTLE_MS = 1000

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart", "scroll"] as const

/**
 * App-wide inactivity timeout — logs the player out (revoking the refresh
 * token, same as the manual Log Out button) after IDLE_TIMEOUT_MS with no
 * pointer/keyboard/scroll activity anywhere in the app. Mounted once at the
 * root (see __root.tsx) alongside useSocketConnection() — same "one
 * instance for the whole app" pattern. A no-op while logged out, so it's
 * safe to mount unconditionally on every route including public ones.
 */
export function useIdleLogout() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastResetRef = useRef(0)

  useEffect(() => {
    if (!isAuthenticated) return

    function armTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const returnTo = window.location.pathname
        logout().finally(() => {
          navigate({ to: "/login", search: { idle: true, redirect: returnTo === "/login" ? undefined : returnTo } })
        })
      }, IDLE_TIMEOUT_MS)
    }

    function onActivity() {
      const now = Date.now()
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return
      lastResetRef.current = now
      armTimer()
    }

    armTimer()
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity))
    }
  }, [isAuthenticated, logout, navigate])
}
