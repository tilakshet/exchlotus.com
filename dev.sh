#!/usr/bin/env bash
# One-command local dev environment: Postgres + Redis (Docker), then the
# backend and frontend dev servers, with combined prefixed logging.
#
# Usage:
#   ./dev.sh          # start everything; Postgres/Redis stay up after Ctrl+C
#   ./dev.sh --down   # on Ctrl+C, also stop the Postgres/Redis containers

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
# wrapper leaves that child running (hit this exact issue earlier today).
# taskkill //F //T kills the whole tree; plain `kill` covers non-Windows.
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
  # A wedged Docker Desktop engine can hang instead of erroring (hit this
  # exact case earlier today) — bound it so a bad engine can't hang the
  # whole script, same reasoning as commandTimeout on the Redis client.
  timeout 5 docker info >/dev/null 2>&1
}

# Only used once, to decide whether to launch a fresh Docker Desktop or
# just wait on one that's already opening — not in the poll loop below.
docker_desktop_process_running() {
  command -v powershell.exe >/dev/null 2>&1 &&
    powershell.exe -NoProfile -Command "exit [int](-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue))" >/dev/null 2>&1
}

# Docker Desktop's install location varies by machine (per-user installs
# land under %LocalAppData%\Programs\DockerDesktop instead of the
# system-wide Program Files path) — check both instead of hardcoding one.
find_docker_desktop_exe() {
  local candidates=(
    "/c/Program Files/Docker/Docker/Docker Desktop.exe"
    "${LOCALAPPDATA:-}/Programs/DockerDesktop/Docker Desktop.exe"
    "/c/Users/${USERNAME:-${USER:-}}/AppData/Local/Programs/DockerDesktop/Docker Desktop.exe"
  )
  local candidate
  for candidate in "${candidates[@]}"; do
    [ -f "$candidate" ] && { echo "$candidate"; return 0; }
  done
  return 1
}

# Launches Docker Desktop if it isn't open yet, then polls the engine
# (not just the process — the GUI can be "open" for a while before the
# engine actually answers) until it responds or we give up.
ensure_docker_running() {
  docker_engine_ready && return 0

  local docker_desktop_exe
  if docker_desktop_process_running; then
    echo "==> Docker Desktop is already open but its engine isn't ready yet — waiting..."
  elif docker_desktop_exe=$(find_docker_desktop_exe); then
    echo "==> Docker Desktop isn't running — launching it..."
    # cmd /c start, not a bare background exec: a plain `&` ties the GUI
    # process to this script's job control, so it dies with the script on
    # Ctrl+C/exit (hit this exact issue with a different GUI app earlier
    # today). `start` hands it off fully detached.
    cmd //c start "" "$(cygpath -w "$docker_desktop_exe" 2>/dev/null || echo "$docker_desktop_exe")" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then
    echo "==> Docker Desktop isn't running — launching it..."
    open -a "Docker Desktop"
  else
    echo "Docker's engine isn't responding and Docker Desktop wasn't found to auto-launch." >&2
    echo "Start Docker (Desktop app, or 'sudo systemctl start docker' on Linux), then re-run ./dev.sh." >&2
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
  echo "==> Stopping backend and frontend..."
  kill_tree "${BACKEND_PID:-}"
  kill_tree "${FRONTEND_PID:-}"
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

echo "==> Starting backend (npm run dev)..."
(cd "$ROOT/backend" && npm run dev) > >(sed -u "s/^/[backend] /") 2>&1 &
BACKEND_PID=$!

echo "==> Starting frontend (npm run dev)..."
(cd "$ROOT/frontend" && npm run dev) > >(sed -u "s/^/[frontend] /") 2>&1 &
FRONTEND_PID=$!

echo "==> All services running. Press Ctrl+C to stop."
echo ""

while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[backend] exited unexpectedly — shutting everything down."
    cleanup
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "[frontend] exited unexpectedly — shutting everything down."
    cleanup
  fi
  sleep 1
done
