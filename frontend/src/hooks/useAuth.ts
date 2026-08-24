import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as authApi from "@/api/auth.api"
import { store, useAppDispatch, useAppSelector } from "@/store"
import { credentialsReceived, loggedOut } from "@/store/authSlice"
import type { Gender } from "@/types/profile"

/**
 * Facade over the Redux auth slice — same shape/call sites as the old
 * Context-based mock (`useAuth().isAuthenticated`, `.user`, `.logout()`),
 * now backed by real JWT auth against the backend instead of localStorage
 * roleplay. `login`/`register` are async and can throw ApiError; callers
 * that show a form (routes/login.tsx) catch and display it.
 */
export function useAuth() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)
  const isAuthenticated = user !== null

  const login = useCallback(
    async (phone: string, password: string) => {
      const tokens = await authApi.login({ phone, password })
      // The login response only carries tokens, not profile fields — let
      // useProfile() fill in the real username on next render; avoids a
      // second blocking request before the user is considered "logged in".
      dispatch(credentialsReceived({ user: { username: `player_${phone.slice(-4)}`, phone, currency: "INR" }, tokens }))
    },
    [dispatch]
  )

  const register = useCallback(
    async (username: string, phone: string, password: string, gender: Gender, email?: string) => {
      const tokens = await authApi.registerAccount({ username, phone, email, password, gender })
      dispatch(credentialsReceived({ user: { username, phone, email, currency: "INR" }, tokens }))
    },
    [dispatch]
  )

  const requestOtp = useCallback((phone: string) => authApi.requestOtp(phone), [])

  const verifyOtp = useCallback(
    async (phone: string, code: string, referralCode?: string, gender?: Gender) => {
      const tokens = await authApi.verifyOtp({ phone, code, referralCode, gender })
      // Same reasoning as login() above: enough of a user object to render
      // immediately (matches the backend's own placeholder username for new
      // phone accounts), useProfile() corrects it on next render.
      dispatch(credentialsReceived({ user: { username: `player_${phone.slice(-4)}`, phone, currency: "INR" }, tokens }))
    },
    [dispatch]
  )

  const logout = useCallback(async () => {
    const refreshToken = store.getState().auth.refreshToken
    dispatch(loggedOut())
    queryClient.clear()
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {
        // Already logged out client-side regardless — a failed revoke call
        // just means the refresh token expires naturally instead.
      })
    }
  }, [dispatch, queryClient])

  return { user, isAuthenticated, login, register, requestOtp, verifyOtp, logout }
}
