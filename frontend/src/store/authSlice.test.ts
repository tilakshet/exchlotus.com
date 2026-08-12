import { describe, expect, it } from "vitest"
import { authReducer, credentialsReceived, loggedOut, profileUpdated, tokensRefreshed } from "./authSlice"

const user = { username: "player", email: "player@example.com", currency: "INR" }
const tokens = { accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 }

describe("authSlice", () => {
  it("starts with no session", () => {
    const state = authReducer(undefined, { type: "@@INIT" })
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
  })

  it("stores user + tokens on credentialsReceived", () => {
    const state = authReducer(undefined, credentialsReceived({ user, tokens }))
    expect(state.user).toEqual(user)
    expect(state.accessToken).toBe("access-1")
    expect(state.refreshToken).toBe("refresh-1")
  })

  it("rotates only the tokens on tokensRefreshed, leaving the user intact", () => {
    const loggedIn = authReducer(undefined, credentialsReceived({ user, tokens }))
    const refreshed = authReducer(loggedIn, tokensRefreshed({ accessToken: "access-2", refreshToken: "refresh-2", expiresIn: 900 }))
    expect(refreshed.user).toEqual(user)
    expect(refreshed.accessToken).toBe("access-2")
    expect(refreshed.refreshToken).toBe("refresh-2")
  })

  it("updates the user without touching tokens on profileUpdated", () => {
    const loggedIn = authReducer(undefined, credentialsReceived({ user, tokens }))
    const updated = authReducer(loggedIn, profileUpdated({ ...user, username: "renamed" }))
    expect(updated.user?.username).toBe("renamed")
    expect(updated.accessToken).toBe("access-1")
  })

  it("clears everything on loggedOut", () => {
    const loggedIn = authReducer(undefined, credentialsReceived({ user, tokens }))
    const out = authReducer(loggedIn, loggedOut())
    expect(out.user).toBeNull()
    expect(out.accessToken).toBeNull()
    expect(out.refreshToken).toBeNull()
  })
})
