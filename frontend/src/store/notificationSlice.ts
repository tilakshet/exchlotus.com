import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface AppNotification {
  id: string
  message: string
  createdAt: string
  read: boolean
}

interface NotificationState {
  items: AppNotification[]
}

const initialState: NotificationState = {
  items: [],
}

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notificationReceived: {
      reducer(state, action: PayloadAction<AppNotification>) {
        state.items.unshift(action.payload)
      },
      prepare(message: string) {
        return {
          payload: {
            id: crypto.randomUUID(),
            message,
            createdAt: new Date().toISOString(),
            read: false,
          } satisfies AppNotification,
        }
      },
    },
    notificationMarkedRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload)
      if (item) item.read = true
    },
    notificationsCleared(state) {
      state.items = []
    },
  },
})

export const { notificationReceived, notificationMarkedRead, notificationsCleared } = notificationSlice.actions
export const notificationReducer = notificationSlice.reducer
