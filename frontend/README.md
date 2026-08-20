# exchlotus frontend

React 19 + TypeScript + Vite + TanStack Router/Query + Redux Toolkit +
TailwindCSS + shadcn/ui. Three surfaces share one app: a public landing
page (`/`), the authenticated dashboard (`/dashboard/*`), and `/login`.
See root `CLAUDE.md` for the platform-wide architecture goals this project
works toward.

## Setup

1. `npm install`
2. Copy `.env` if you don't already have one — `VITE_API_BASE_URL` should
   point at the backend (default `http://127.0.0.1:4000`). The four
   `VITE_SOCIAL_*_URL` vars are optional — set the ones you have a real
   profile for; any left unset point that footer icon to `/dashboard`
   in-app instead of linking to `#`.
3. The backend must be running (`../backend`, see its README) — this app
   has no mock-server fallback of its own; every `api/*.api.ts` call hits
   a real endpoint.
4. `npm run dev`

## Folder structure

```
src/
  api/            Typed request functions, one file per backend domain
                  (auth/wallet/catalog/provider/games/profile). Nothing
                  outside this folder calls fetch() directly — see below.
  hooks/          TanStack Query hooks (useWallet, useGames, ...) and
                  other reusable hooks (useAuth, useFavorites, useGatedNavigate).
  store/          Redux Toolkit — auth/UI/notification state ONLY.
                  Server data lives in TanStack Query, not here.
  features/       Feature-scoped UI + logic that's more than a dumb
                  component (wallet/, games/) — forms, modals, the pieces
                  that call mutations.
  components/     Presentational components, grouped by surface
                  (landing/, dashboard-shell/, dashboard/, ui/ for shadcn primitives).
  routes/         TanStack Router file-based routes.
  services/       socket.service.ts — the one Socket.IO connection.
  types/          Types mirroring backend response shapes.
  lib/            Cross-cutting utilities (query-client.ts, utils.ts).
  data/           Static/mock content that isn't backend-driven (landing
                  page marketing copy, dashboard shell nav labels).
```

## API layer

Every backend call goes through `api/http.ts`'s `apiRequest<T>()` — no
component or hook calls `fetch()` directly. It:

- Reads the access token from the Redux store and attaches
  `Authorization: Bearer <token>` (unless `anonymous: true` — used by
  `auth.api.ts`'s own login/register/logout, which obviously can't send a
  token that doesn't exist yet).
- On a `401`, refreshes once via `/api/auth/refresh` and retries the
  original request. Concurrent requests that 401 at the same moment share
  **one** refresh call, not one each — the backend's refresh tokens are
  single-use/rotating (see backend README), so firing two would make the
  second one fail. Verified in `api/http.test.ts`, including the
  concurrent case.
- Throws a typed `ApiError` (`status`, `code`, `message`) on any non-2xx
  response; `api/api-error.ts`'s `friendlyErrorMessage()` maps that to
  user-facing copy per status/code (401/403/404/409/422/429/500, plus a
  network-failure case for when `fetch` itself throws).

## Authentication flow

Real JWT auth against the backend (`hooks/useAuth.ts`), not the
localStorage roleplay this app used before the backend existed:

1. `routes/login.tsx` — a single screen, tab-toggled between Sign In and
   Create Account, each its own React Hook Form + Zod schema.
2. `useAuth().login(email, password)` / `.register(...)` call
   `api/auth.api.ts`, then dispatch `credentialsReceived` into the Redux
   auth slice, which persists `{ user, accessToken, refreshToken }` to
   `localStorage` (see `store/authSlice.ts` — plain `localStorage`, not a
   library, since only this one slice needs to survive a refresh).
3. Every subsequent request authenticates via `api/http.ts` as above.
4. `useAuth().logout()` clears the Redux slice, clears the TanStack Query
   cache (`queryClient.clear()` — so a second user logging in on the same
   browser session never sees the first user's cached wallet/profile), and
   best-effort revokes the refresh token server-side.
5. A `redirect` search param carries the player back to whatever gated
   action sent them to `/login` (see `hooks/useGatedNavigate.ts`).

`user.username`/`user.email` come from the login/register response
directly (the backend doesn't return profile fields on those endpoints —
see backend README's endpoint table); `hooks/useProfile.ts` fetches the
full profile separately once authenticated.

## Game launch flow

`features/games/`:

1. `GameCard` — Play button. If `useAuth().isAuthenticated` is false,
   navigates to `/login?redirect=/dashboard` instead of launching (spec
   step 1, "verify authentication").
2. `GameCatalogSection` opens `GameLaunchModal` for the clicked game.
3. The modal shows a loading state, calls `useLaunchGame()` →
   `POST /api/game-session/launch` (userId comes from the verified access
   token server-side, not anything the client sends — see backend README).
4. The response's `launchUrl` is validated (must parse as a URL, must be
   `https:`) before it's used — an invalid response shows an error state,
   never gets fed to the iframe unchecked.
5. Rendered in an iframe inside the modal (not a new window — simpler
   close-detection, works the same for the "refresh on close" step next).
6. On close, invalidates the wallet and wallet-history queries — the two
   things a game session can actually change server-side. (There's no
   separate "recently played" endpoint to invalidate: `useRecentlyPlayed`
   derives from wallet history, so invalidating that covers it too.)

## Wallet — always server-authoritative

Every number shown (available/bonus/locked balance, transaction history)
comes straight from a TanStack Query result. Nothing in this codebase adds
or subtracts a balance locally — `hooks/useWallet.ts`'s mutations
(`useDeposit`/`useWithdraw`) just call the API and invalidate on success;
the displayed balance always comes from the next fetch, not from
optimistically guessing the new number. `hooks/useTransactions.ts` is a
cursor-paginated `useInfiniteQuery`, loaded via an `IntersectionObserver`
sentinel in `TransactionHistoryList` (real infinite scroll, not a "load
more" button pretending to be one).

**Deposit/withdraw are demo-only.** The backend endpoints behind them are
instant, unconditional balance adjustments — there's no payment gateway.
The form reflects that honestly (just an amount field, no card/UPI
collection UI implying something that isn't there).

## Real-time (Socket.IO)

One connection for the whole app (`services/socket.service.ts`, mounted
once in `routes/__root.tsx`), opened when a session exists and torn down
on logout. Reconnection is socket.io-client's default behavior, not
hand-rolled.

| Event | Handled how |
|---|---|
| `wallet:update` | The payload carries the balance the server just wrote (it only fires after a real ledger mutation — see backend README's wallet idempotency section), so it's applied to the cached wallet immediately via `setQueryData`, then both the wallet and wallet-history queries are invalidated to trigger a real refetch behind it. Not a client-side guess being corrected later — the socket event itself is already server-authoritative. |
| `notification` | Dispatched into `store/notificationSlice.ts`. |
| `bet:update` / `provider:update` | No listener — the backend doesn't emit these yet either (see backend README). Nothing to wire up to nothing. |

## Error handling

`api/api-error.ts` is the single place HTTP status codes become copy.
Every data-fetching component follows the same three-state pattern
(`isLoading` → skeleton, `isError` → message + Retry button calling
`refetch()`, success → real content) — see `WalletWidget`,
`TransactionHistoryList`, and `GameCatalogSection` for the pattern; new
data-driven components should match it rather than inventing a new one.

## Testing

`npm run test` (Vitest + Testing Library + jsdom). Representative, not
exhaustive — four files chosen for what they actually protect against
regressing:

- `store/authSlice.test.ts` — reducer logic.
- `api/http.test.ts` — the auth-refresh-retry logic, including the
  concurrent-401s-share-one-refresh case, which is the single most
  fragile piece of this codebase to get wrong silently.
- `api/api-error.test.ts` — every status/code → message mapping.
- `hooks/useFavorites.test.ts` — localStorage persistence across remounts.
- `features/wallet/DepositWithdrawForm.test.tsx` — component + RHF/Zod
  integration; **this test run caught a real bug** (an unhandled promise
  rejection when a deposit/withdraw mutation failed, since the component
  awaited `mutateAsync` without a try/catch) that's now fixed in the
  component, not just documented here.

## Known gaps (mirrors backend README's "Not yet done")

- Favorites are `localStorage`-only (`hooks/useFavorites.ts`) — no backend
  endpoint exists, so they don't sync across devices/browsers.
- "Recently Played" is derived from transaction history's `gameId` field,
  not a dedicated feature.
- No test coverage for the landing page, dashboard shell chrome, or the
  routing layer itself — the four areas above were chosen because they're
  where a silent regression would be worst (auth, money, cross-session
  data leakage), not because everything else is guaranteed correct.
