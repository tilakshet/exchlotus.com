import { Outlet } from "@tanstack/react-router"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/shared/Toaster"

export function AppShell() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
