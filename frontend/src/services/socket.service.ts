import { useEffect } from "react"
import { io, type Socket } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useAppDispatch, useAppSelector } from "@/store"
import { notificationReceived } from "@/store/notificationSlice"
import { walletQueryKey } from "@/hooks/useWallet"
import { useAuth } from "@/hooks/useAuth"

// Same undefined-vs-empty-string distinction as api/http.ts's BASE_URL —
// socket.io-client's own same-origin fallback only kicks in for a
// null/undefined uri, not "", so passing "" through unchanged would try to
// connect to a malformed "https://" (empty host) instead of falling back.
const envBaseUrl = import.meta.env.VITE_API_BASE_URL
const SOCKET_URL = envBaseUrl === undefined ? "http://127.0.0.1:4000" : envBaseUrl || window.location.origin

interface WalletUpdatePayload {
  balance: number
}

/**
 * One socket connection for the whole app, opened once a session exists and
 * torn down on logout — mounted once near the root (see routes/__root.tsx).
 * socket.io-client reconnects automatically on drop by default; we don't
 * need to hand-roll that.
 *
 * Server events wired to real handlers: `wallet:update` (invalidate the
 * wallet query — balances are never computed locally, just refetched),
 * `notification`, and `session:revoked` (single-active-session enforcement
 * — see Player.sessionVersion in schema.prisma and socket.server.ts).
 * `bet:update`/`provider:update` are defined server-side but have no real
 * emitter yet (see backend README), so there's nothing to listen for on
 * those two today.
 */
export function useSocketConnection() {
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    if (!accessToken) return

    const socket: Socket = io(SOCKET_URL, { auth: { token: accessToken } })

    // A newer login elsewhere just revoked this device's session server-side
    // (requireAuth would reject its next request either way) — logout()
    // clears local auth state immediately; the redirect matches the
    // suspended/idle banner pattern on the login page.
    socket.on("session:revoked", () => {
      logout().finally(() => {
        navigate({ to: "/login", search: { sessionRevoked: true } })
      })
    })

    socket.on("wallet:update", (payload: WalletUpdatePayload) => {
      queryClient.setQueryData(walletQueryKey, (prev: unknown) =>
        prev && typeof prev === "object" ? { ...prev, balance: payload.balance } : prev
      )
      queryClient.invalidateQueries({ queryKey: walletQueryKey })
      queryClient.invalidateQueries({ queryKey: ["wallet", "history"] })
    })

    socket.on("notification", (payload: { message: string; link?: string }) => {
      dispatch(notificationReceived(payload.message, payload.link))
      // A support-ticket reply is the one event on this channel today (see
      // admin/backend's replyToTicket → publishPlayerNotification) — without
      // this, a player sitting on an open ticket thread never sees the
      // admin's reply appear until they navigate away and back (TanStack
      // Query has no other reason to refetch a query with no active
      // subscription-driven refresh). Broad match on the link rather than a
      // dedicated event name, since the socket payload shape is generic.
      if (payload.link?.includes("/support/")) {
        queryClient.invalidateQueries({ queryKey: ["support-ticket"] })
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, dispatch, queryClient, navigate, logout])
}
