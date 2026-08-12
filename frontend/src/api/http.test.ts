import { beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "@/store"
import { credentialsReceived, loggedOut } from "@/store/authSlice"
import { apiRequest } from "./http"
import { ApiError } from "./api-error"

const user = { username: "player", email: "player@example.com", currency: "INR" }

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("apiRequest", () => {
  beforeEach(() => {
    store.dispatch(loggedOut())
    vi.restoreAllMocks()
  })

  it("attaches the Authorization header when a session exists", async () => {
    store.dispatch(
      credentialsReceived({ user, tokens: { accessToken: "token-a", refreshToken: "refresh-a", expiresIn: 900 } })
    )
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    await apiRequest("/api/profile")

    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBe("Bearer token-a")
  })

  it("does not attach a header for anonymous requests, even with a session", async () => {
    store.dispatch(
      credentialsReceived({ user, tokens: { accessToken: "token-a", refreshToken: "refresh-a", expiresIn: 900 } })
    )
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    await apiRequest("/api/auth/login", { method: "POST", body: {}, anonymous: true })

    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined()
  })

  it("on a 401, refreshes once and retries the original request with the new token", async () => {
    store.dispatch(
      credentialsReceived({ user, tokens: { accessToken: "stale-token", refreshToken: "refresh-a", expiresIn: 900 } })
    )

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(401, { error: "TOKEN_EXPIRED" })) // original request
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "fresh-token", refreshToken: "refresh-b", expiresIn: 900 })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, { balance: 100 })) // retried original request

    const result = await apiRequest<{ balance: number }>("/api/wallet")

    expect(result).toEqual({ balance: 100 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toContain("/api/auth/refresh")
    const retryInit = fetchMock.mock.calls[2][1]
    expect((retryInit?.headers as Record<string, string> | undefined)?.Authorization).toBe("Bearer fresh-token")
    expect(store.getState().auth.accessToken).toBe("fresh-token")
  })

  it("logs out if the refresh token itself is rejected", async () => {
    store.dispatch(
      credentialsReceived({ user, tokens: { accessToken: "stale-token", refreshToken: "dead-refresh", expiresIn: 900 } })
    )

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(401, { error: "TOKEN_EXPIRED" }))
      .mockResolvedValueOnce(jsonResponse(401, { error: "INVALID_REFRESH_TOKEN" }))

    await expect(apiRequest("/api/wallet")).rejects.toThrow()
    expect(store.getState().auth.accessToken).toBeNull()
  })

  it("two concurrent 401s share a single refresh call, not one each", async () => {
    store.dispatch(
      credentialsReceived({ user, tokens: { accessToken: "stale-token", refreshToken: "refresh-a", expiresIn: 900 } })
    )

    // Both requests fire while the token is stale — the first two calls
    // (one per request) 401, then the refresh call succeeds, then both
    // requests retry and succeed. If the dedup logic in http.ts is broken,
    // this would instead see 2 refresh calls (one per request).
    let refreshCalls = 0
    let nonRefreshCalls = 0
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/auth/refresh")) {
        refreshCalls += 1
        return jsonResponse(200, { accessToken: "fresh-token", refreshToken: "refresh-b", expiresIn: 900 })
      }
      nonRefreshCalls += 1
      // First two = the two original (stale-token) requests; anything after = retries.
      return jsonResponse(nonRefreshCalls <= 2 ? 401 : 200, { data: "ok" })
    })

    await Promise.all([apiRequest("/api/wallet"), apiRequest("/api/profile")])

    expect(refreshCalls).toBe(1)
  })
})

describe("ApiError", () => {
  it("carries status/code/message through", () => {
    const err = new ApiError(409, "EMAIL_TAKEN", "Email is already registered")
    expect(err.status).toBe(409)
    expect(err.code).toBe("EMAIL_TAKEN")
    expect(err.message).toBe("Email is already registered")
  })
})
