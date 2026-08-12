import { useEffect } from "react"
import { io, type Socket } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import { useAppDispatch, useAppSelector } from "@/store"
import { notificationReceived } from "@/store/notificationSlice"
import { walletQueryKey } from "@/hooks/useWallet"

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
 * wallet query — balances are never computed locally, just refetched) and
 * `notification`. `bet:update`/`provider:update` are defined server-side
 * but have no real emitter yet (see backend README), so there's nothing to
 * listen for on those two today.
 */
export function useSocketConnection() {
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!accessToken) return

    const socket: Socket = io(SOCKET_URL, { auth: { token: accessToken } })

    socket.on("wallet:update", (payload: WalletUpdatePayload) => {
      queryClient.setQueryData(walletQueryKey, (prev: unknown) =>
        prev && typeof prev === "object" ? { ...prev, balance: payload.balance } : prev
      )
      queryClient.invalidateQueries({ queryKey: walletQueryKey })
      queryClient.invalidateQueries({ queryKey: ["wallet", "history"] })
    })

    socket.on("notification", (payload: { message: string }) => {
      dispatch(notificationReceived(payload.message))
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, dispatch, queryClient])
}
