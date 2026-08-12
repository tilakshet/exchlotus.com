#!/usr/bin/env bash
# One-command local dev environment for the admin platform: Postgres +
# Redis (Docker), then backend + admin backend + admin frontend dev
# servers, with combined prefixed logging. Mirrors dev.sh's conventions
# exactly — see that file for the player-app equivalent.
#
# Usage:
#   ./dev-admin.sh          # start everything; Postgres/Redis stay up after Ctrl+C
#   ./dev-admin.sh --down   # on Ctrl+C, also stop the Postgres/Redis containers

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOP_DOCKER=0
[ "${1:-}" = "--down" ] && STOP_DOCKER=1

wait_for_port() {
  local host=$1 port=$2 timeout=$3 waited=0
  while ! (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; do
    exec 3<&- 2>/dev/null
    sleep 0.5
    waited=$((waited + 1))
    [ "$waited" -ge $((timeout * 2)) ] && return 1
  done
  exec 3<&- 2>/dev/null
  return 0
}

# npm.cmd on Windows wraps a real node/tsx child process — killing just the
# wrapper leaves that child running. taskkill //F //T kills the whole tree;
# plain `kill` covers non-Windows.
kill_tree() {
  local pid=$1
  [ -z "$pid" ] && return
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$pid" >/dev/null 2>&1
  else
    kill "$pid" >/dev/null 2>&1
  fi
}

docker_engine_ready() {
  # A wedged Docker Desktop engine can hang instead of erroring — bound it
  # so a bad engine can't hang the whole script.
  timeout 5 docker info >/dev/null 2>&1
}

docker_desktop_process_running() {
  command -v powershell.exe >/dev/null 2>&1 &&
    powershell.exe -NoProfile -Command "exit [int](-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue))" >/dev/null 2>&1
}

ensure_docker_running() {
  docker_engine_ready && return 0

  if docker_desktop_process_running; then
    echo "==> Docker Desktop is already open but its engine isn't ready yet — waiting..."
  elif [ -f "/c/Program Files/Docker/Docker/Docker Desktop.exe" ]; then
    echo "==> Docker Desktop isn't running — launching it..."
    cmd //c start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then
    echo "==> Docker Desktop isn't running — launching it..."
    open -a "Docker Desktop"
  else
    echo "Docker's engine isn't responding and Docker Desktop wasn't found to auto-launch." >&2
    echo "Start Docker (Desktop app, or 'sudo systemctl start docker' on Linux), then re-run ./dev-admin.sh." >&2
    return 1
  fi

  echo "==> Waiting for Docker's engine to come up (cold start can take 1-2 minutes)..."
  local waited=0 max_wait=180
  while ! docker_engine_ready; do
    sleep 3
    waited=$((waited + 3))
    if [ "$waited" -ge "$max_wait" ]; then
      echo "Docker's engine still isn't responding after ${max_wait}s." >&2
      echo "Open Docker Desktop and check its status — it may need a manual restart (Quit from the tray icon, then reopen)." >&2
      return 1
    fi
    [ $((waited % 15)) -eq 0 ] && echo "    ...still waiting (${waited}s)"
  done
  echo "==> Docker engine is ready."
}

cleanup() {
  echo ""
  echo "==> Stopping backend, admin-backend, and admin-frontend..."
  kill_tree "${BACKEND_PID:-}"
  kill_tree "${ADMIN_BACKEND_PID:-}"
  kill_tree "${ADMIN_FRONTEND_PID:-}"
  if [ "$STOP_DOCKER" = "1" ]; then
    echo "==> Stopping Postgres + Redis containers..."
    docker compose -f "$ROOT/docker-compose.yml" down
  else
    echo "==> Postgres + Redis left running (pass --down to stop them too next time)."
  fi
  exit 0
}
trap cleanup INT TERM

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker isn't installed or isn't on PATH." >&2
  exit 1
fi

ensure_docker_running || exit 1

echo "==> Starting Postgres + Redis (docker compose)..."
if ! docker compose -f "$ROOT/docker-compose.yml" up -d; then
  echo "docker compose up failed even though the engine reported ready — check .env has POSTGRES_PASSWORD set, and see the error above." >&2
  exit 1
fi

echo "==> Waiting for Postgres (127.0.0.1:5433)..."
wait_for_port 127.0.0.1 5433 60 || { echo "Postgres did not become reachable within 60s." >&2; exit 1; }
echo "==> Waiting for Redis (127.0.0.1:6379)..."
wait_for_port 127.0.0.1 6379 30 || { echo "Redis did not become reachable within 30s." >&2; exit 1; }
echo "==> Postgres + Redis are up."

if [ ! -f "$ROOT/admin/backend/.env" ]; then
  echo "admin/backend/.env is missing — copy admin/backend/.env.example and fill in real values first." >&2
  exit 1
fi

echo "==> Starting backend (npm run dev)..."
(cd "$ROOT/backend" && npm run dev) > >(sed -u "s/^/[backend] /") 2>&1 &
BACKEND_PID=$!

echo "==> Starting admin-backend (npm run dev)..."
(cd "$ROOT/admin/backend" && npm run dev) > >(sed -u "s/^/[admin-backend] /") 2>&1 &
ADMIN_BACKEND_PID=$!

echo "==> Starting admin-frontend (npm run dev)..."
(cd "$ROOT/admin/frontend" && npm run dev) > >(sed -u "s/^/[admin-frontend] /") 2>&1 &
ADMIN_FRONTEND_PID=$!

echo "==> All services running. Admin UI: http://localhost:5174  (Ctrl+C to stop)"
echo ""

while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[backend] exited unexpectedly — shutting everything down."
    cleanup
  fi
  if ! kill -0 "$ADMIN_BACKEND_PID" 2>/dev/null; then
    echo "[admin-backend] exited unexpectedly — shutting everything down."
    cleanup
  fi
  if ! kill -0 "$ADMIN_FRONTEND_PID" 2>/dev/null; then
    echo "[admin-frontend] exited unexpectedly — shutting everything down."
    cleanup
  fi
  sleep 1
done
