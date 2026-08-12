import { useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/store"
import { credentialsReceived, loggedOut as loggedOutAction, tokensRefreshed } from "@/store/adminAuthSlice"
import * as authApi from "@/api/auth.api"
import type { AdminAuthTokens, MfaChallenge } from "@/types/auth"

function isMfaChallenge(result: AdminAuthTokens | MfaChallenge): result is MfaChallenge {
  return "mfaRequired" in result
}

/**
 * Two-step login (password, then optionally TOTP) needs the freshly issued
 * access token in the Redux store BEFORE calling /auth/me — apiRequest
 * (api/http.ts) reads the token from the store, not from a parameter, so
 * tokens must land in state first and the resulting user second. Both
 * dispatches still happen before this function returns, so callers never
 * observe the intermediate "tokens but no user" state.
 */
async function completeLogin(dispatch: ReturnType<typeof useAppDispatch>, tokens: AdminAuthTokens) {
  dispatch(tokensRefreshed(tokens))
  const user = await authApi.me()
  dispatch(credentialsReceived({ user, tokens }))
}

export function useAdminAuth() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.adminAuth.user)
  const refreshToken = useAppSelector((s) => s.adminAuth.refreshToken)

  const login = useCallback(
    async (email: string, password: string): Promise<MfaChallenge | { mfaRequired: false }> => {
      const result = await authApi.login(email, password)
      if (isMfaChallenge(result)) return result
      await completeLogin(dispatch, result)
      return { mfaRequired: false }
    },
    [dispatch]
  )

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string) => {
      const tokens = await authApi.verifyMfa(challengeToken, code)
      await completeLogin(dispatch, tokens)
    },
    [dispatch]
  )

  const logout = useCallback(async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined)
    }
    dispatch(loggedOutAction())
  }, [dispatch, refreshToken])

  const hasPermission = useCallback((code: string) => user?.permissions.includes(code) ?? false, [user])

  return { user, isAuthenticated: user !== null, login, verifyMfa, logout, hasPermission }
}
