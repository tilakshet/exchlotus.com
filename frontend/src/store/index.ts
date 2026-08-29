import { configureStore } from "@reduxjs/toolkit"
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"
import { authReducer, persistAuth } from "./authSlice"
import { uiReducer } from "./uiSlice"
import { notificationReducer } from "./notificationSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    notifications: notificationReducer,
  },
})

// Redux Toolkit only manages auth/UI/notification state per CLAUDE.md's
// state-management split — persistence is plain localStorage, not a
// library like redux-persist, since only the auth slice needs to survive
// a refresh.
// Seeded from the actual rehydrated state (not hardcoded null) — a fresh
// page load (bookmark, refresh, new tab) can start already-authenticated,
// restored from localStorage before this module's first subscriber fire
// ever runs. Hardcoding null here meant that if the *next* dispatch after
// such a load was logout (a very ordinary sequence: land on the page,
// immediately log out), the snapshot ("null", nothing persisted) compared
// equal to the never-reconciled lastPersisted ("null", never having run),
// short-circuited the guard below, and persistAuth(null) silently never
// ran — logout cleared Redux but left the real tokens sitting in
// localStorage.
let lastPersisted: string | null = store.getState().auth.accessToken ? JSON.stringify(store.getState().auth) : null
store.subscribe(() => {
  const { auth } = store.getState()
  const snapshot = auth.accessToken ? JSON.stringify(auth) : null
  if (snapshot === lastPersisted) return
  lastPersisted = snapshot
  persistAuth(auth.accessToken && auth.user && auth.refreshToken ? { user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken } : null)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
