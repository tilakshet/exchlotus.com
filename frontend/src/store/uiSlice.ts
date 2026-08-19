import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface UiState {
  sidebarOpen: boolean
}

const initialState: UiState = {
  sidebarOpen: false,
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
  },
})

export const { sidebarToggled, sidebarSet } = uiSlice.actions
export const uiReducer = uiSlice.reducer
