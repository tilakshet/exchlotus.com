import { useNavigate } from "@tanstack/react-router"
import { ChevronDown, LogOut, Moon, ShieldQuestion, Sun, UserRound } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/store"
import { themeToggled } from "@/store/uiSlice"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function TopBar() {
  const { user, logout } = useAdminAuth()
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.ui.theme)
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate({ to: "/login" })
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">{user && <Badge variant="primary">{user.roleName.replaceAll("_", " ")}</Badge>}</div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => dispatch(themeToggled())}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md py-1 pr-2 pl-1.5 text-sm outline-none transition-colors hover:bg-hover-tint focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="size-3.5" aria-hidden="true" />
              </span>
              <span className="hidden max-w-40 truncate sm:inline">{user?.email}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.firstName} {user?.lastName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="opacity-60">
              <ShieldQuestion className="size-4" aria-hidden="true" />
              {user?.permissions.length ?? 0} permissions granted
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
