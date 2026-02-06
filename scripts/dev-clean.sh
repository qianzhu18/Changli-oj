#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3003}"

EXISTING_PIDS="$(lsof -ti tcp:"$PORT" || true)"
if [[ -n "$EXISTING_PIDS" ]]; then
  echo "Killing process on port $PORT: $EXISTING_PIDS"
  kill -9 $EXISTING_PIDS
fi

# Force a clean dev compile to avoid stale CSS/chunk states.
rm -rf .next

echo "Starting changli-oj at http://127.0.0.1:$PORT"
exec ./node_modules/.bin/next dev -p "$PORT"
