#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Check Node.js
if ! command -v node &>/dev/null; then
  echo ""
  echo "  [ERROR] Node.js is not installed."
  echo ""
  echo "  macOS:   brew install node"
  echo "  Ubuntu:  sudo apt install -y nodejs"
  echo "  Windows: https://nodejs.org/"
  echo ""
  exit 1
fi

# Auto-install dependencies if missing
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install --production
fi

# Read PORT from .env.local (default 18790)
PORT=18790
if [ -f .env.local ]; then
  _p=$(grep '^PORT=' .env.local 2>/dev/null | cut -d= -f2)
  [ -n "$_p" ] && PORT="$_p"
fi

echo "  Starting Arona WebUI on port ${PORT} ..."

# Start server in background
node src/server.mjs &
SERVER_PID=$!

# Wait briefly then open browser
sleep 1
URL="http://localhost:${PORT}"
if command -v xdg-open &>/dev/null; then
  xdg-open "$URL" 2>/dev/null || true
elif command -v open &>/dev/null; then
  open "$URL" 2>/dev/null || true
fi

# Wait for server process
wait $SERVER_PID
