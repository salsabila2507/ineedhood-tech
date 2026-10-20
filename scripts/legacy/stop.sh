#!/usr/bin/env bash
# Stop the server bound to port 8080.
set -euo pipefail
PID=$(ss -ltnp 2>/dev/null | awk '/:8080 /{print $NF}' | grep -o 'pid=[0-9]*' | cut -d= -f2 || true)
if [ -n "${PID:-}" ]; then kill "$PID" && echo "stopped $PID"; else echo "not running"; fi
