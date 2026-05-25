#!/usr/bin/env bash
# Starts both the FastAPI backend and Vite frontend.
# Usage: bash dev.sh  (or: ./dev.sh after chmod +x dev.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UVICORN="$ROOT/venv/bin/uvicorn"
PYTHON="$ROOT/venv/bin/python"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if [ ! -f "$UVICORN" ]; then
  echo "ERROR: venv not found. Run: make install"
  exit 1
fi

if [ ! -f "$ROOT/.env" ]; then
  echo "ERROR: .env not found. Run: cp backend/.env.example .env  (then fill in your values)"
  exit 1
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "ERROR: node_modules missing. Run: make install"
  exit 1
fi

# Check for broken vite install (common after interrupted npm install)
if [ ! -f "$ROOT/frontend/node_modules/vite/bin/vite.js" ]; then
  echo "ERROR: node_modules is incomplete (vite missing). Run:"
  echo "  rm -rf frontend/node_modules && cd frontend && npm install"
  exit 1
fi

# ── Free port 8000 if already in use ─────────────────────────────────────────
if lsof -ti:8000 >/dev/null 2>&1; then
  echo "Port 8000 is in use — killing existing process..."
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# ── Cleanup on exit ───────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""
cleanup() {
  echo ""
  echo "Stopping servers..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Done."
}
trap cleanup INT TERM EXIT

# ── Start backend ─────────────────────────────────────────────────────────────
echo "Starting backend on http://localhost:8000 ..."
cd "$ROOT/backend"
"$UVICORN" app.main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Start frontend ────────────────────────────────────────────────────────────
echo "Starting frontend on http://localhost:5173 ..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# ── Ready ─────────────────────────────────────────────────────────────────────
echo ""
echo "  Backend   → http://localhost:8000"
echo "  API docs  → http://localhost:8000/docs"
echo "  Frontend  → http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both."
echo ""

wait
