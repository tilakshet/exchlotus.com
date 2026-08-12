import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const THEME_STORAGE_KEY = "exchlotus-admin-theme"

function readInitialTheme(): "light" | "dark" {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

export interface Toast {
  id: string
  title: string
  description?: string
  variant: "default" | "success" | "destructive"
}

interface UiState {
  theme: "light" | "dark"
  sidebarCollapsed: boolean
  toasts: Toast[]
}

const initialState: UiState = {
  theme: readInitialTheme(),
  sidebarCollapsed: false,
  toasts: [],
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    themeToggled(state) {
      state.theme = state.theme === "dark" ? "light" : "dark"
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    toastShown(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload)
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { themeToggled, sidebarToggled, toastShown, toastDismissed } = uiSlice.actions
export const uiReducer = uiSlice.reducer
