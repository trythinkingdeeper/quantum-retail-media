#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV="$BACKEND/.venv"

# ── API key ────────────────────────────────────────────────────────────────
if [ -z "$ANTHROPIC_API_KEY" ]; then
  if [ -f "$BACKEND/.env" ]; then
    export $(grep -v '^#' "$BACKEND/.env" | xargs)
  fi
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "  ANTHROPIC_API_KEY is not set."
  echo ""
  echo "  Option 1 — export it before running:"
  echo "    export ANTHROPIC_API_KEY=sk-..."
  echo "    ./start.sh"
  echo ""
  echo "  Option 2 — create backend/.env:"
  echo "    echo 'ANTHROPIC_API_KEY=sk-...' > backend/.env"
  echo "    ./start.sh"
  echo ""
  exit 1
fi

# ── Python venv + deps ─────────────────────────────────────────────────────
if [ ! -d "$VENV" ]; then
  echo "▸ Creating Python virtual environment..."
  python3 -m venv "$VENV"
fi

echo "▸ Installing Python dependencies..."
"$VENV/bin/pip" install -q -r "$BACKEND/requirements.txt"

# ── Node deps ──────────────────────────────────────────────────────────────
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "▸ Installing Node dependencies..."
  cd "$FRONTEND" && npm install --silent
fi

# ── Mode ───────────────────────────────────────────────────────────────────
MODE="${1:-dev}"

if [ "$MODE" = "demo" ]; then
  echo "▸ Building frontend for production..."
  cd "$FRONTEND" && npm run build --silent
fi

# ── Start servers ──────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "▸ Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "▸ Starting backend on :8000..."
cd "$BACKEND"
ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" "$VENV/bin/uvicorn" main:app --port 8000 &
BACKEND_PID=$!

echo "▸ Starting frontend on :3000..."
cd "$FRONTEND"
if [ "$MODE" = "demo" ]; then
  npm run start -- --port 3000 &
else
  npm run dev -- --port 3000 &
fi
FRONTEND_PID=$!

echo ""
if [ "$MODE" = "demo" ]; then
  echo "  Quantum Retail Media is running (production build)."
else
  echo "  Quantum Retail Media is running (dev mode)."
fi
echo "  Open http://localhost:3000"
echo "  Press Ctrl+C to stop."
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
