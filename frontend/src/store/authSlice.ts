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
}

const persisted = loadPersisted()

const initialState: AuthState = {
  user: persisted?.user ?? null,
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<{ user: AuthUser; tokens: AuthTokens }>) {
      state.user = action.payload.user
      state.accessToken = action.payload.tokens.accessToken
      state.refreshToken = action.payload.tokens.refreshToken
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
    },
  },
})

export const { credentialsReceived, tokensRefreshed, profileUpdated, loggedOut } = authSlice.actions
export const authReducer = authSlice.reducer
