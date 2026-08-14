import { Outlet } from "@tanstack/react-router"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { BottomNav } from "./BottomNav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/shared/Toaster"

/**
 * Below md (768px, phone/small-tablet viewports) the fixed desktop rail
 * doesn't fit, so it's replaced by BottomNav (a fixed mobile tab bar) —
 * `main` gets bottom padding on mobile only so content never sits behind
 * it (BottomNav is `fixed`, not part of flex flow).
 */
export function AppShell() {
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
