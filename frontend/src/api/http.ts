import { store } from "@/store"
import { loggedOut, tokensRefreshed } from "@/store/authSlice"
import { ApiError } from "./api-error"
import type { AuthTokens } from "@/types/auth"

// Distinguishes "unset" (undefined — no .env.local, local dev without a
// backend override) from an explicit empty string (the production Docker
// build arg, see docker-compose.prod.yml) — `??` alone would collapse both
// to the same fallback, but they mean different things: undefined wants
// the local dev backend, "" wants same-origin (nginx proxies /api/* to the
// backend container, see frontend/nginx.conf.template) since there's no
// separate host to point at in production.
const envBaseUrl = import.meta.env.VITE_API_BASE_URL
const BASE_URL = envBaseUrl === undefined ? "http://127.0.0.1:4000" : envBaseUrl || window.location.origin

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  query?: Record<string, string | number | undefined>
  /** Skip the Authorization header entirely (auth endpoints themselves). */
  anonymous?: boolean
}

// Concurrent requests that all 401 at once must share ONE refresh call, not
// fire one each — this holds the in-flight refresh so followers await it
// instead of racing the refresh-token rotation (see backend auth.service.ts
// — a refresh token is single-use, so a second concurrent refresh call
// would fail with INVALID_REFRESH_TOKEN).
let refreshInFlight: Promise<string | null> | null = null

async function performRefresh(): Promise<string | null> {
  const refreshToken = store.getState().auth.refreshToken
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error("refresh failed")
    const tokens = (await res.json()) as AuthTokens
    store.dispatch(tokensRefreshed(tokens))
    return tokens.accessToken
  } catch {
    store.dispatch(loggedOut())
    return null
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function rawRequest(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && !options.anonymous ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  })
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = store.getState().auth.accessToken
  let res = await rawRequest(path, options, accessToken)

  if (res.status === 401 && !options.anonymous && store.getState().auth.refreshToken) {
    refreshInFlight ??= performRefresh().finally(() => {
      refreshInFlight = null
    })
    const newToken = await refreshInFlight
    if (newToken) {
      res = await rawRequest(path, options, newToken)
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? "UNKNOWN_ERROR", json?.message ?? res.statusText, json?.issues)
  }

  return json as T
}
