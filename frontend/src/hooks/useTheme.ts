import { useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/store"
import { themeSet } from "@/store/uiSlice"

export type Theme = "dark" | "light"

/**
 * Backed by Redux (store/uiSlice.ts), not per-component useState — theme
 * used to be local state re-derived independently in every component that
 * called this hook, so toggling in one place (e.g. ThemeToggle) never
 * re-rendered others (e.g. Logo), which is why the logo could keep showing
 * the wrong-theme image/blend-mode combination after a toggle with no page
 * reload. Shared state means every caller re-renders together. The DOM
 * attribute + localStorage sync happens once in store/index.ts, not here,
 * so it doesn't duplicate per call site.
 */
export function useTheme() {
  const theme = useAppSelector((s) => s.ui.theme)
  const dispatch = useAppDispatch()

  const toggle = useCallback(() => {
    dispatch(themeSet(theme === "dark" ? "light" : "dark"))
  }, [dispatch, theme])

  return { theme, toggle }
}
