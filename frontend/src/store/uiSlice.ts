import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface UiState {
  sidebarOpen: boolean
  theme: "light" | "dark"
}

// index.html's blocking inline script already set data-theme on <html> from
// localStorage before this module ever runs (avoids a flash of the wrong
// theme) — read that instead of hardcoding "light", so the store's initial
// state matches what's already painted rather than fighting it on first render.
function readInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
}

const initialState: UiState = {
  sidebarOpen: false,
  theme: readInitialTheme(),
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    sidebarToggled(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    sidebarSet(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    themeSet(state, action: PayloadAction<"light" | "dark">) {
      state.theme = action.payload
    },
  },
})

export const { sidebarToggled, sidebarSet, themeSet } = uiSlice.actions
export const uiReducer = uiSlice.reducer
