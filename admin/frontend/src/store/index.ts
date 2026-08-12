import { configureStore } from "@reduxjs/toolkit"
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"
import { adminAuthReducer, persistAuth } from "./adminAuthSlice"
import { uiReducer } from "./uiSlice"

export const store = configureStore({
  reducer: {
    adminAuth: adminAuthReducer,
    ui: uiReducer,
  },
})

let lastPersisted: string | null = null
store.subscribe(() => {
  const { adminAuth } = store.getState()
  const snapshot = adminAuth.accessToken ? JSON.stringify(adminAuth) : null
  if (snapshot === lastPersisted) return
  lastPersisted = snapshot
  persistAuth(
    adminAuth.accessToken && adminAuth.user && adminAuth.refreshToken
      ? { user: adminAuth.user, accessToken: adminAuth.accessToken, refreshToken: adminAuth.refreshToken }
      : null
  )
})

const THEME_STORAGE_KEY = "exchlotus-admin-theme"
let lastAppliedTheme: "light" | "dark" | null = null
store.subscribe(() => {
  const { theme } = store.getState().ui
  if (theme === lastAppliedTheme) return
  lastAppliedTheme = theme
  document.documentElement.setAttribute("data-theme", theme)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private browsing / storage disabled — theme still applies this session via the DOM attribute.
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
