import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { AdminAuthTokens, AdminAuthUser } from "@/types/auth"

const STORAGE_KEY = "exchlotus-admin.auth"

interface PersistedAuth {
  user: AdminAuthUser
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

interface AdminAuthState {
  user: AdminAuthUser | null
  accessToken: string | null
  refreshToken: string | null
}

const persisted = loadPersisted()

const initialState: AdminAuthState = {
  user: persisted?.user ?? null,
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
}

const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<{ user: AdminAuthUser; tokens: AdminAuthTokens }>) {
      state.user = action.payload.user
      state.accessToken = action.payload.tokens.accessToken
      state.refreshToken = action.payload.tokens.refreshToken
    },
    tokensRefreshed(state, action: PayloadAction<AdminAuthTokens>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
    },
    profileUpdated(state, action: PayloadAction<AdminAuthUser>) {
      state.user = action.payload
    },
    loggedOut(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
    },
  },
})

export const { credentialsReceived, tokensRefreshed, profileUpdated, loggedOut } = adminAuthSlice.actions
export const adminAuthReducer = adminAuthSlice.reducer
