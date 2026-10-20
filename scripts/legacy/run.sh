#!/usr/bin/env bash
# Start the 0XYAS Office static build on port 8080.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs
if ss -ltn 2>/dev/null | grep -q ':8080 '; then
  echo "already running on 8080"
  exit 0
fi
setsid nohup python3 -m http.server 8080 --bind 0.0.0.0 --directory dist \
  > logs/web.log 2>&1 < /dev/null &
sleep 1
echo "started: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/)"
