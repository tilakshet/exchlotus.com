# exchlotus backend — Gaming API integration

The **outbound** gaming-provider integration (`gaming-provider.client.ts`)
has been through two versions:

1. Originally built against a pasted "Enterprise Integration Suite —
   Gaming API Specification v2.4" doc: OAuth2 `agent_token:agent_secret` →
   short-lived `access_token`, `/games/*` paths.
2. **Currently** built against a different, real provider (an API-docs
   screenshot showing  `/v1/catalog/providers`, `/v1/catalog/games`,
   `/v1/sessions/launch`, and a `/v1/campaigns/*` free-spins CRUD set) with
   a simpler auth model — one static API key sent as
   `Authorization: Bearer <key>` on every call, no token-exchange step.

The **inbound** webhook (`gaming-webhook.controller.ts` — the provider
calling us for account details/balance/bet/win/refund) is still built
against spec v2.4 and is untouched by the v2 client rewrite; nothing
in the screenshot addressed that side.

On top of both, this also implements the app-level surface the frontend
actually needs that neither spec covers at all: user registration/login
(JWT + refresh tokens), a wallet REST API, profile, game categories, and a
Socket.IO server for real-time wallet updates.

**The real v2 provider is live and reachable.** `GET /v1/catalog/providers`
and `GET /v1/catalog/games` are confirmed against it — both return real
data through our own `syncCatalog()` code path, not just a raw curl check
(189 providers, ~15.1k games, upserted into Postgres with provider→category
links intact). `POST /v1/sessions/launch` also responds with the documented
`{ game_url, session }` shape, and as of 2026-08-22 `game_url` itself
resolves to an actual working game client (confirmed via a real browser
load in both `fun` and `real` mode) — an earlier issue where it pointed at
a broken error page was on the provider's side and has been fixed; see
"Provider integration — v2 endpoint set" below for the full history.

## Stack

Node.js + TypeScript + Express + Prisma + PostgreSQL, per the existing
project architecture (see repo-root `CLAUDE.md`).

## Setup

1. **Database + Redis.** From the repo root, copy `.env.example` to `.env`
   and set `POSTGRES_PASSWORD`, then:
   ```sh
   docker compose up -d
   ```
   This starts Postgres (host port **5433**, not the Postgres default
   5432 — chosen to not collide with a natively-installed Postgres on the
   same machine) and Redis (6379), both via `docker-compose.yml`, with the
   `exchlotus_app` role / `exchlotus_dev` database auto-created from that
   compose file's `POSTGRES_USER`/`POSTGRES_DB`. Only needs to be done
   once per machine — the volume persists across restarts.

   (If you'd rather use a natively-installed Postgres instead of Docker,
   create the role/db yourself — `CREATE ROLE exchlotus_app WITH LOGIN
   PASSWORD '...' CREATEDB; CREATE DATABASE exchlotus_dev OWNER
   exchlotus_app;` — and point `DATABASE_URL` below at that instance's
   port instead. `CREATEDB` is only needed for Prisma's shadow database
   during `migrate dev`.)
2. Copy `backend/.env.example` to `backend/.env` and fill in
   `DATABASE_URL` with that role's credentials (port **5433** if you used
   `docker compose up` above). `.env` is gitignored — never commit it.
3. `npm install`
4. `npm run prisma:migrate` (first time only — the migration is already
   committed under `prisma/migrations/`, so this just applies it)
5. `npm run seed` — creates the exact player (`user_id: "12345"`, balance
   `1500.75`) used in the spec's own worked examples, so those examples can
   be replayed against this implementation directly. Also sets its password
   to `password123` (email `user@example.com`) so the app-level auth flow
   can be exercised against the same fixture, and seeds the four default
   game categories.
6. `npm run dev` — starts the API on `:4000` (HTTP + Socket.IO on the same
   port). The mock gaming provider on `:4100` only auto-starts if
   `GAMING_PROVIDER_BASE_URL` points at localhost — right now it's set to
   the real provider, so it won't. To exercise catalog sync/game launch
   against the mock instead, run it separately and override for that
   command only:
   ```sh
   npx tsx src/mocks/gaming-provider-mock.server.ts   # separate terminal
   GAMING_PROVIDER_BASE_URL="http://127.0.0.1:4100/api" npm run dev
   ```
   (Don't set the override by assigning `process.env.X` before an `import`
   in the same file and expect it to take effect — ES module imports are
   hoisted above the rest of the file body, so `env.ts` reads `.env` before
   that assignment runs. Set it at the shell/process level instead, as above.)

## API endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ username, phone, email?, password }` → tokens. Not in the original spec — added because there was otherwise no way to create an account. `phone` is required (not just `email`) so the resulting account can also use `/api/auth/login`, which looks players up by phone. |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ accessToken, refreshToken, expiresIn }` |
| POST | `/api/auth/refresh` | — | `{ refreshToken }` → new token pair. Refresh tokens rotate — the old one is revoked the moment a new one is issued. |
| POST | `/api/auth/logout` | — | `{ refreshToken }` → revokes it |
| GET | `/api/profile` | ✓ | username, email, currency, memberSince |
| GET | `/api/wallet` | ✓ | balance, bonusBalance, lockedBalance (bonus/locked always 0 today — see below), currency |
| GET | `/api/wallet/history` | ✓ | `?cursor=&limit=` — cursor-paginated ledger entries |
| POST | `/api/wallet/deposit` | ✓ | `{ amount }` — **instant, unconditional** balance credit. No payment gateway exists; this is a dev/demo placeholder, not real money movement |
| POST | `/api/wallet/withdraw` | ✓ | `{ amount }` — same caveat, in reverse; returns `422 INSUFFICIENT_BALANCE` if it would go negative |
| GET | `/api/catalog/providers` | — | |
| GET | `/api/catalog/categories` | — | |
| GET | `/api/catalog/games` | — | `?category=&provider=&search=` |
| POST | `/api/catalog/sync` | — | Pulls from the gaming provider (v2 client) and upserts. `TODO`: gate this behind an admin/internal check. Not yet run against the real provider — see below |
| POST | `/api/game-session/launch` | ✓ | `{ gameId, currency, mode }` (`lang` still accepted for backward compat, no longer forwarded — the v2 launch endpoint's inferred shape has no language field) — `playerId` comes from the verified access token, **not** the request body |
| POST | `/api/gaming_webhook` | HMAC signature | The gaming provider calls this, not the frontend — see main section above |

## Real-time (Socket.IO)

Connect to the same origin/port as the REST API, authenticating via the
handshake (not a header):

```js
io("http://localhost:4000", { auth: { token: accessToken } })
```

| Event | Direction | Real trigger today? |
|---|---|---|
| `wallet:update` | server → client | **Yes** — fires whenever `wallet.service.applyLedgerEntry` actually changes a balance (bet/win/refund/deposit/withdrawal), scoped to that player's own socket room. Verified: a deposit via REST was observed arriving over an open socket within the same test run. |
| `notification` | server → client | Scaffolded, not yet wired to a real trigger |
| `bet:update` | server → client | Scaffolded, not yet wired — no live-betting feature exists to produce it |
| `provider:update` | server → client | Scaffolded, not yet wired — no provider-status feature exists to produce it |

`bet:update`/`provider:update` deliberately don't emit synthetic/fake data
— they're typed and room-based, ready for a real feature to use, but silent
until one exists.

## Provider integration — v2 endpoint set

`gaming-provider.client.ts` calls these, all under `GAMING_PROVIDER_BASE_URL`
(currently `https://igaming-one-psi.vercel.app/api`), authenticated with
`Authorization: Bearer ${GAMING_PROVIDER_API_KEY}` on every request:

| Method | Path | Client method |
|---|---|---|
| GET | `/v1/catalog/providers` | `getProviders()` |
| GET | `/v1/catalog/games` | `getGames({ provider?, category? })` |
| POST | `/v1/sessions/launch` | `launchSession({ gameId, playerId, currency, mode })` |
| GET | `/v1/campaigns` | `listCampaigns()` |
| POST | `/v1/campaigns` | `createCampaign({ name, gameId, spinsCount, expiresAt? })` |
| POST | `/v1/campaigns/{id}/grant` | `grantCampaign(id, { playerId })` |
| POST | `/v1/campaigns/{id}/revoke` | `revokeCampaign(id, { playerId })` |
| POST | `/v1/campaigns/{id}/cancel` | `cancelCampaign(id)` |

**Every request/response field above is inferred, not confirmed.** The
source was a screenshot of an API reference page showing method + path +
a one-line description per endpoint — no request/response JSON schema.
`gaming-provider.types.ts` documents this at the top of the file; nothing
here has been checked against a real response, because nothing has called
the real API yet (by instruction — see top of this README).

**What *is* verified**, against the local mock
(`src/mocks/gaming-provider-mock.server.ts`, updated to match this same
endpoint set): every client method resolves correctly end-to-end,
including `catalog.service.ts`'s `syncCatalog()` — pulled provider/game
data through the real upsert logic and confirmed the rows land in Postgres
with the game→provider→category links intact. A bug surfaced during this:
`cancelCampaign()` was typed to return `void` and discarded the response
body, even though the endpoint's description ("cancel an entire campaign,
revoking all grants") implies it returns the updated campaign, which the
mock does — fixed to return `Campaign`.

**Provider/game linking.** `GameV2.providerId` always references
`ProviderV2.id` (never the optional `code` field), so `catalog.service.ts`
stores the v2 API's own `id` in our `Provider.code` column (a generic
"external unique key" slot, not literally a "code") — using the optional
`code` instead would silently break the game→provider link for any
provider where `code` differs from `id`.

**The campaigns (free-spins) endpoints have no consumer yet** — the
client methods exist and are mock-verified, but there's no Prisma model,
service, or REST route on our side exposing this to the frontend. Wiring
that up is a distinct, not-yet-requested feature.

**An earlier domain didn't work at all.** Before this Vercel URL, `.env`
briefly pointed at `api.gaming-provider.com` (from spec v2.4) and
`api.gamingprovider.com` — the former doesn't resolve in DNS, the latter
resolves but fails TLS entirely and returns a generic `403 Forbidden —
Request forbidden by administrative rules` on plain HTTP regardless of
headers or token, consistent with a parked domain or a WAF blocking
everything rather than a real API.

## Architecture

```
src/
  modules/
    provider-integration/gaming-provider/
      gaming-provider.client.ts   outbound: static API-key auth, catalog,
                                   session launch, campaigns (v2 endpoint set)
      gaming-provider.types.ts    inferred shapes — see file header, unconfirmed
    wallet/
      wallet.service.ts           the ONE place balances get mutated —
                                   idempotent, row-locked, atomic. Used by
                                   both the gaming webhook AND the REST API
      wallet.controller.ts        GET /wallet, /wallet/history, deposit, withdraw
    webhook/
      gaming-webhook.controller.ts inbound: signature check → validate → dispatch
      gaming-webhook.validators.ts zod schema per method
      gaming-webhook.service.ts    method → wallet.service call → response shape
    catalog/                      our own cached copy of the provider's catalog,
                                   plus categories (our own concept — see below)
    game-session/                 launch-URL endpoint the frontend calls
    auth/                         app-level auth — JWT access + rotating
                                   refresh tokens, bcrypt password hashing.
                                   Entirely separate from the gaming
                                   provider's own OAuth2 (gaming-provider.client.ts)
    profile/                      GET /profile
  socket/
    socket.server.ts              Socket.IO, JWT-authenticated handshake,
                                   one room per player, wallet:update emitter
  mocks/
    gaming-provider-mock.server.ts  stands in for the real v2 provider —
                                     see "Provider integration" above
  lib/
    env.ts        zod-validated env, fails fast on missing/invalid config
    prisma.ts     Prisma 7 client (driver-adapter based — see below)
    logger.ts     pino, pretty-printed in development
    api-error.ts  GamingApiError — the spec's 5 business error codes (§7)
    events.ts     in-process event bus (wallet.service → socket server)
```

### Wallet idempotency (spec §6)

Every bet/win/refund goes through `wallet.service.applyLedgerEntry`, which:

1. Locks the player's wallet row (`SELECT ... FOR UPDATE`) for the duration
   of the check-then-act sequence, so concurrent requests for the *same*
   player serialize instead of racing (different players proceed in
   parallel, unaffected).
2. Looks for an existing ledger entry keyed on `(transactionId, type)` —
   **not** `transactionId` alone, since the spec notes a refund may reuse
   the original bet's transaction ID.
3. If found with the same amount → returns the already-recorded balance,
   applies nothing (idempotent replay).
4. If found with a *different* amount → returns `DOUBLED_BET` (see "Open
   questions" below — this distinction isn't explicit in the spec).
5. Otherwise, debits/credits the wallet and inserts the ledger row in the
   same DB transaction.

Verified, not just implemented: 10 truly concurrent requests with an
identical `transaction_id` were fired at the running server and all ten
converged on the same post-bet balance, with exactly one row landing in
`ledger_entries` — confirmed directly against the database, not just via
the HTTP responses.

### Prisma 7 note

Prisma 7 removed `datasource.url` from `schema.prisma` — connection config
now lives in `prisma.config.ts`, and `PrismaClient` requires an explicit
driver adapter (`@prisma/adapter-pg` here) rather than reading
`DATABASE_URL` implicitly. Both files reflect this; if you're used to
Prisma 5/6, this is the main structural difference to know about.

## Open questions (the provided spec doesn't cover these — flagging rather than silently guessing)

The pasted specification appears to be **truncated** (it cuts off mid-word
in the final error description) and is missing pieces a complete
integration doc would normally include:

- **Webhook signature/auth scheme — resolved 2026-08-19.** The pasted spec
  didn't document one, so this originally implemented a self-invented
  `X-Webhook-Signature: <hex>` HMAC-SHA256-over-body scheme as a
  placeholder. The provider's support team confirmed their real,
  fixed integration pattern is a plain `Authorization: Bearer <token>`
  header instead — they never sent the HMAC header, which is why every
  real-money `user_balance` check was silently rejected with 401 from
  Aug 15 onward. Now checks a bearer token against
  `GAMING_WEBHOOK_SHARED_SECRET`.
- **`DOUBLED_BET` vs. idempotent replay.** §6 says duplicate requests with
  *identical* parameters should silently return the existing balance;
  §7 separately lists `DOUBLED_BET` as an error for "wager transaction ID
  already executed previously." Taken together, this implementation reads
  §6 as governing true replays (same transaction_id **and** same amount)
  and reserves `DOUBLED_BET` for a same-ID-different-amount conflict — but
  the spec never states this distinction explicitly. Confirm against real
  provider behavior.
- **Refund direction.** §5.5 says refund can reverse *either* a bet
  (credit back a debit) or an invalid win payout (debit back a credit),
  but the request payload has no field indicating which, and the only
  worked example is a credit. Implemented as always-crediting the wallet
  to match that example. If refunding a bad win payout is a real use case,
  the provider needs to send a disambiguating field.
- **Game history.** CLAUDE.md's provider-interface list includes
  `getHistory()`; the provided spec has no corresponding endpoint (possibly
  in the missing/truncated portion). Not implemented.

## Not yet done

- **`POST /api/catalog/sync` has no auth gate.** Anyone who can reach the
  API can trigger it. Marked `TODO` in code — needs an admin/internal check.
  (`/api/game-session/launch` *was* the same issue and is now fixed:
  `userId`/`userName` come from the verified access token, not the request
  body.)
- **Deposit/withdraw are not real payment processing.** `POST
  /wallet/deposit` and `/wallet/withdraw` instantly and unconditionally
  adjust the balance — there's no payment gateway, no pending state, no
  reconciliation. This exists so the frontend has something real to call
  during development, not as a stand-in for CLAUDE.md's Payment
  Architecture module.
- **Bonus/locked balance are always 0.** The wallet schema has
  `bonusBalance`/`lockedBalance` columns and the API returns them, but
  nothing in the system — no promotions engine, no wagering-requirement
  tracking, no KYC-hold mechanism — ever writes to them. They exist so the
  response shape is stable for whenever those features are built.
- **Categories are inferred, not real.** Neither the original spec's game
  catalog nor the v2 provider's `GameV2` type is confirmed to carry a
  category field. `catalog/category-seed.ts` assigns one via a simple
  name/provider regex heuristic (or the v2 response's `category` string
  if present and it happens to match one of our seeded codes). Fine for
  demo data, not something to trust at real scale.
- **Rate limiting / brute-force protection** on `/api/auth/login` and the
  webhook endpoint — neither exists yet.
- ~~Session launch doesn't actually produce a playable game~~ **Fixed by the
  provider, confirmed 2026-08-22.** The 2026-08-13 issue below was on their
  side (a regional deployment change adding latency to a pre-launch
  validation step, causing intermittent timeouts) — reverted on their end.
  Retested `POST /v1/sessions/launch` against a real synced game
  (dreamplay's "Wolf Street") in both `fun` and `real` mode: both return
  `200` with a `game_url` that now actually loads a working game client
  (confirmed via a real browser load, not just an HTTP status check — the
  provider's own game wrapper UI renders correctly, no `game-error`
  redirect). The frontend's "Play" button was already wired to trust this
  response; that was previously a real risk given the bug below, now
  resolved. If a *specific* `game_id` still comes back broken, the provider
  asked to be sent that id + a timestamp for them to check individually —
  it's no longer a systemic issue.

  <details>
  <summary>Original 2026-08-13 finding (kept for history)</summary>

  Confirmed live against `https://igaming-one-psi.vercel.app/api`:
  `POST /v1/sessions/launch` returned `200` with the documented
  `{ game_url, session }` shape for every game/provider tried, but
  `game_url` itself resolved to `https://gator.drakon.casino/game-error` —
  not a 4xx/5xx we could catch and retry, a "success" response pointing at
  a broken game. Tried across two different providers (rubyplay, mancala)
  in `fun` mode, same result both times.
  </details>
- **Campaigns (free-spins) have no consumer.** The client methods exist
  and are mock-verified; there's no Prisma model, service, or REST route
  exposing this to the frontend yet.
