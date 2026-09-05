import { store } from "@/store"
import { loggedOut, tokensRefreshed } from "@/store/adminAuthSlice"
import { ApiError } from "./api-error"
import type { AdminAuthTokens } from "@/types/auth"

// Same undefined-vs-empty-string distinction as the player frontend's
// api/http.ts: undefined (no .env override) means local dev against the
// local admin backend; "" means same-origin (the admin frontend's own
// nginx proxies /admin-api/* to admin-backend, see admin/frontend/nginx.conf.template).
const envBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL
const BASE_URL = envBaseUrl === undefined ? "http://127.0.0.1:4600" : envBaseUrl || window.location.origin

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  query?: Record<string, string | number | undefined>
  anonymous?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

async function performRefresh(): Promise<string | null> {
  const refreshToken = store.getState().adminAuth.refreshToken
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE_URL}/admin-api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error("refresh failed")
    const tokens = (await res.json()) as AdminAuthTokens
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
  const accessToken = store.getState().adminAuth.accessToken
  let res = await rawRequest(path, options, accessToken)

  if (res.status === 401 && !options.anonymous && store.getState().adminAuth.refreshToken) {
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
    throw new ApiError(
      res.status,
      json?.error ?? "UNKNOWN_ERROR",
      json?.message ?? res.statusText,
      json?.issues,
      typeof json?.retryAfterSeconds === "number" ? json.retryAfterSeconds : undefined
    )
  }

  return json as T
}

/**
 * Authenticated file download — admin-api uses Bearer-token auth (no
 * cookies), so a plain `<a href>`/`window.location` navigation can't carry
 * the Authorization header. `fetch` + Blob is the correct (only) way to
 * include it; every export endpoint caps rows server-side (see
 * admin/backend/src/lib/export.ts MAX_EXPORT_ROWS), so buffering the
 * response in memory here is bounded, not a large-file risk.
 */
export async function downloadFile(path: string, query?: RequestOptions["query"]): Promise<void> {
  const accessToken = store.getState().adminAuth.accessToken
  let res = await rawRequest(path, { query }, accessToken)

  if (res.status === 401 && store.getState().adminAuth.refreshToken) {
    refreshInFlight ??= performRefresh().finally(() => {
      refreshInFlight = null
    })
    const newToken = await refreshInFlight
    if (newToken) res = await rawRequest(path, { query }, newToken)
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new ApiError(res.status, json?.error ?? "UNKNOWN_ERROR", json?.message ?? res.statusText, json?.issues)
  }

  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition")
  const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? "export"

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Same auth problem as downloadFile above, but for displaying an image
 * inline (`<img src>`) rather than triggering a save-to-disk — used for KYC
 * document review, where the file must never be reachable via a plain
 * unauthenticated URL. Caller owns the returned object URL and must
 * URL.revokeObjectURL() it when done (see useEffect cleanup in the KYC
 * review component) to avoid leaking memory across re-renders.
 */
export async function fetchAuthenticatedImageUrl(path: string): Promise<string> {
  const accessToken = store.getState().adminAuth.accessToken
  let res = await rawRequest(path, {}, accessToken)

  if (res.status === 401 && store.getState().adminAuth.refreshToken) {
    refreshInFlight ??= performRefresh().finally(() => {
      refreshInFlight = null
    })
    const newToken = await refreshInFlight
    if (newToken) res = await rawRequest(path, {}, newToken)
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new ApiError(res.status, json?.error ?? "UNKNOWN_ERROR", json?.message ?? res.statusText, json?.issues)
  }

  return URL.createObjectURL(await res.blob())
}
