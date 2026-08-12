# VPS Deployment

Full stack (Postgres + backend + built frontend) runs via Docker Compose
behind Nginx, which terminates TLS and reverse-proxies `/api` and
`/socket.io` to the backend on the same origin as the frontend — so the
production frontend needs no CORS config at all. Local dev frontends
pointed at this backend are cross-origin and go through `CORS_ORIGIN`
instead (see "Local dev against the shared backend" below).

Alongside this, `admin-backend` + the admin build embedded in this same
Nginx image (see `frontend/Dockerfile`) serve a completely separate admin
platform at `https://admin.<DOMAIN>` — separate auth, separate RBAC,
separate JWT secret, sharing only the Postgres/Redis instances as source of
truth. See `admin/backend/README.md`-equivalent context in the architecture
notes for how it's structured; the steps below cover both apps together
since they deploy as one Compose stack.

## One-time VPS setup

Run as a user with Docker permissions (either root, or a user in the
`docker` group).

**1. Install Docker + Compose plugin** (skip if already installed):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

**2. Open the firewall:**

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

**3. Point DNS at the VPS** — create A records for your domain **and**
`admin.` + your domain, both pointing at the VPS's IP address, and wait for
them to propagate (`dig yourdomain.com` and `dig admin.yourdomain.com`
should both return the VPS IP) before continuing — Let's Encrypt's
challenge will fail otherwise.

**4. Clone the repo:**

```bash
git clone <your-repo-url> exchlotusplatform
cd exchlotusplatform
```

**5. Create the production env files:**

```bash
cp .env.production.example .env.production
cp backend/.env.production.example backend/.env.production
cp admin/backend/.env.production.example admin/backend/.env.production
```

Edit all three:
- `.env.production` — set `DOMAIN`, `LETSENCRYPT_EMAIL`, and a strong
  `POSTGRES_PASSWORD`.
- `backend/.env.production` — set `DATABASE_URL`'s password to match
  `POSTGRES_PASSWORD` above, replace `yourdomain.com` in `CORS_ORIGIN`
  with your real domain, and generate real secrets for
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GAMING_WEBHOOK_SHARED_SECRET`,
  and `GAMING_PROVIDER_API_KEY` (e.g. `openssl rand -hex 32` each).
- `admin/backend/.env.production` — set `DATABASE_URL`'s password the same
  way, set `CORS_ORIGIN` to `https://admin.` + your domain, generate a
  `JWT_ACCESS_SECRET` **different from** backend's (never reuse it — see
  that file's own comment), and set `ADMIN_BOOTSTRAP_EMAIL` /
  `ADMIN_BOOTSTRAP_PASSWORD` to real values — these provision the first
  SUPER_ADMIN account on first seed run (step 7).

**6. Bootstrap SSL and bring everything up:**

```bash
chmod +x deploy/init-letsencrypt.sh
./deploy/init-letsencrypt.sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The backend runs `prisma migrate deploy` automatically on every start (see
`backend/docker-entrypoint.sh`) — this applies the schema for BOTH apps,
since they share one migration history (see `backend/prisma/schema.prisma`'s
admin models). Visit `https://yourdomain.com` to confirm the player app.

**7. Seed admin roles/permissions and the first Super Admin:**

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec admin-backend npm run seed
```

This is safe to re-run — it only creates the bootstrap admin account if
none exist yet, and always re-syncs the built-in roles' permission sets.
Visit `https://admin.yourdomain.com` and sign in with the
`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` from step 5, then change
the password and enroll MFA immediately from the admin UI.

**8. Set up certificate renewal** — Let's Encrypt certs expire after 90
days. Add a cron job on the VPS:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * 1 cd $(pwd) && docker compose --env-file .env.production -f docker-compose.prod.yml run --rm certbot renew --quiet && docker compose --env-file .env.production -f docker-compose.prod.yml restart frontend") | crontab -
```

## GitHub Actions (deploy on merge to `main`)

`.github/workflows/deploy.yml` SSHes into the VPS and re-deploys on every
push to `main`. Add these secrets under repo Settings → Secrets and
variables → Actions:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP address or domain |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private key for a keypair whose public half is in the VPS's `~/.ssh/authorized_keys` |
| `VPS_PORT` | SSH port (usually `22`) |
| `DEPLOY_PATH` | Absolute path to the cloned repo on the VPS, e.g. `/home/deploy/exchlotusplatform` |

Once these are set, merging to `main` runs `git pull` + rebuilds/restarts
the changed containers on the VPS automatically.

## Local dev against the shared backend

To have your local frontend read the same live data as everyone else
instead of your own local database, point it at the deployed backend
instead of `127.0.0.1:4000`:

```bash
# frontend/.env
VITE_API_BASE_URL=https://yourdomain.com
```

This only works because `backend/.env.production`'s `CORS_ORIGIN` already
includes `http://localhost:5173` and `http://127.0.0.1:5173` — if either of
you runs the Vite dev server on a different port, add it to `CORS_ORIGIN`
on the server and redeploy.

Your own local Postgres/backend (`docker-compose.yml`,
`npm run dev` in `backend/`) still work independently if you want an
isolated environment — just switch `VITE_API_BASE_URL` back to
`http://127.0.0.1:4000`.
