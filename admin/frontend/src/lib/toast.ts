import { store } from "@/store"
import { toastDismissed, toastShown, type Toast } from "@/store/uiSlice"

let counter = 0

/**
 * Plain function, not a hook — same reasoning as authSlice's persistAuth:
 * mutation onSuccess/onError callbacks (react-query) aren't always inside a
 * component that can call a hook, but they can always import and call this.
 */
export function toast(input: Omit<Toast, "id">) {
  const id = `toast-${Date.now()}-${counter++}`
  store.dispatch(toastShown({ id, ...input }))
  setTimeout(() => store.dispatch(toastDismissed(id)), 4500)
  return id
}

export function dismissToast(id: string) {
  store.dispatch(toastDismissed(id))
}
