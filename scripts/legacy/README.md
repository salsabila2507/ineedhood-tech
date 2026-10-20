# legacy

`run.sh` and `stop.sh` start and stop a bare `python3 -m http.server` on :8080.
They are superseded by systemd unit `0xyas-bridge.service`, which runs
`server/bridge.mjs` (static build plus API and SSE). Kept only so the old
commands are still readable. Do not use them on this VM: the bridge already owns
port 8080.
