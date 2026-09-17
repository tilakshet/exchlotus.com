import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { AuthTokens, AuthUser } from "@/types/auth"

const STORAGE_KEY = "exchlotus.auth"

interface PersistedAuth {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

function loadPersisted(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedAuth) : null
  } catch {
    return null
  }
}

export function persistAuth(state: PersistedAuth | null) {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  /**
   * One-shot UI flag, never persisted (persistAuth below only ever writes
   * {user, accessToken, refreshToken} to localStorage regardless of what
   * else lives on this slice) — set true only by a fresh register(), so
   * DashboardLayout can show the welcome-bonus celebration popup exactly
   * once right after signup, then clear it. A page refresh restores auth
   * from localStorage with this flag absent (false), so the popup never
   * reappears on reload.
   */
  signupCelebrationPending: boolean
}

const persisted = loadPersisted()

const initialState: AuthState = {
  user: persisted?.user ?? null,
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
  signupCelebrationPending: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<{ user: AuthUser; tokens: AuthTokens; isNewAccount?: boolean }>) {
      state.user = action.payload.user
      state.accessToken = action.payload.tokens.accessToken
      state.refreshToken = action.payload.tokens.refreshToken
      state.signupCelebrationPending = action.payload.isNewAccount === true
    },
    signupCelebrationShown(state) {
      state.signupCelebrationPending = false
    },
    tokensRefreshed(state, action: PayloadAction<AuthTokens>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
    },
    profileUpdated(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
    },
    loggedOut(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.signupCelebrationPending = false
    },
  },
})

export const { credentialsReceived, signupCelebrationShown, tokensRefreshed, profileUpdated, loggedOut } = authSlice.actions
export const authReducer = authSlice.reducer
