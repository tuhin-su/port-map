#!/bin/sh

# Start Tailscale daemon
tailscaled &

# Wait for it to start
sleep 2

# Bring up Tailscale with subnet routing
if [[ -n "$TS_AUTHKEY" && -n "$TS_SERVER" ]]; then
  echo "[INFO] Tailscale environment variables found. Attempting login..."

  tailscale up \
    --authkey="${TS_AUTHKEY}" \
    --hostname="node-ts-app" \
    --advertise-routes=10.10.1.0/24 \
    --accept-dns=false \
    --login-server="${TS_SERVER}"

  echo "[INFO] Tailscale started successfully."

else
  echo "[WARN] TS_AUTHKEY or TS_SERVER not set. Skipping Tailscale login."
fi

# Keep the container running
cd /app
npm install
node server.js