import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useFavorites } from "./useFavorites"

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts empty", () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
    expect(result.current.isFavorite("game-1")).toBe(false)
  })

  it("toggles a game in and out of favorites", () => {
    const { result } = renderHook(() => useFavorites())

    act(() => result.current.toggleFavorite("game-1"))
    expect(result.current.isFavorite("game-1")).toBe(true)

    act(() => result.current.toggleFavorite("game-1"))
    expect(result.current.isFavorite("game-1")).toBe(false)
  })

  it("persists across remounts (same localStorage)", () => {
    const first = renderHook(() => useFavorites())
    act(() => first.result.current.toggleFavorite("game-2"))
    first.unmount()

    const second = renderHook(() => useFavorites())
    expect(second.result.current.isFavorite("game-2")).toBe(true)
  })

  it("tracks multiple favorites independently", () => {
    const { result } = renderHook(() => useFavorites())
    act(() => {
      result.current.toggleFavorite("game-1")
      result.current.toggleFavorite("game-2")
    })
    expect(result.current.favorites.sort()).toEqual(["game-1", "game-2"])

    act(() => result.current.toggleFavorite("game-1"))
    expect(result.current.favorites).toEqual(["game-2"])
  })
})
