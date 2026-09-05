import { useEffect, useRef } from "react"
import { Outlet, useNavigate } from "@tanstack/react-router"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { BottomNav } from "./BottomNav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/shared/Toaster"
import { useAdminAuth } from "@/hooks/useAdminAuth"

const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"]

/**
 * Below md (768px, phone/small-tablet viewports) the fixed desktop rail
 * doesn't fit, so it's replaced by BottomNav (a fixed mobile tab bar) —
 * `main` gets bottom padding on mobile only so content never sits behind
 * it (BottomNav is `fixed`, not part of flex flow).
 */
export function AppShell() {
  const { logout } = useAdminAuth()
  const navigate = useNavigate()
  const logoutTimer = useRef<number | null>(null)

  useEffect(() => {
    function scheduleLogout() {
      if (logoutTimer.current !== null) window.clearTimeout(logoutTimer.current)
      logoutTimer.current = window.setTimeout(async () => {
        logoutTimer.current = null
        await logout()
        navigate({ to: "/login" })
      }, ADMIN_IDLE_TIMEOUT_MS)
    }

    scheduleLogout()
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, scheduleLogout, { passive: true })
    }

    return () => {
      if (logoutTimer.current !== null) window.clearTimeout(logoutTimer.current)
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, scheduleLogout)
      }
    }
  }, [logout, navigate])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
