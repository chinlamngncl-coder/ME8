#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo " ========================================================"
echo "  Mobility Axiom  —  Enterprise one-click setup"
echo " ========================================================"
echo ""

read -r -p "Please enter your Server IP (LAN or WAN) [Press Enter for 127.0.0.1]: " HOST_IP
HOST_IP="${HOST_IP:-127.0.0.1}"

case "$HOST_IP" in
  172.1[7-9].*|172.2[0-9].*|172.3[0-1].*)
    echo "ERROR: $HOST_IP looks like Docker/WSL. Use real LAN/WAN IP."
    exit 1
    ;;
esac

if [[ ! -f .env ]]; then
  if [[ -f .env.deploy.example ]]; then cp .env.deploy.example .env
  elif [[ -f .env.example ]]; then cp .env.example .env
  else echo "HOST=$HOST_IP" > .env
  fi
fi

set_env() {
  local k="$1" v="$2"
  if grep -qE "^${k}=" .env 2>/dev/null; then
    sed -i.bak "s|^${k}=.*|${k}=${v}|" .env
  else
    printf '%s=%s\n' "$k" "$v" >> .env
  fi
}

set_env HOST "$HOST_IP"
set_env FM_GB28181_PUBLIC_HOST "$HOST_IP"
set_env FM_WVP_STREAM_HOST "$HOST_IP"
set_env WVP_HOST_IP "$HOST_IP"
set_env WVP_HOST "$HOST_IP"
set_env FM_AIRGAP_LICENSE_REQUIRED 1
set_env FM_HTTP_PORT 3888
grep -qE '^GB_PLATFORM_ID=' .env || set_env GB_PLATFORM_ID 99999900002000000001
grep -qE '^GB_DOMAIN=' .env || set_env GB_DOMAIN 9999990000
grep -qE '^WVP_ID=' .env || set_env WVP_ID 99999900002000000001
grep -qE '^WVP_DOMAIN=' .env || set_env WVP_DOMAIN 9999990000

echo "[1/3] Wrote server IP $HOST_IP into .env"
echo "[2/3] Starting Docker services..."
if command -v docker >/dev/null 2>&1; then
  docker compose -f docker/docker-compose.enterprise.yml up -d || true
  docker compose -p me8-wvp -f docker/wvp/docker-compose.wvp.yml up -d || true
else
  echo "WARN: docker not found — skipping compose."
fi

echo "[3/3] Starting Mobility Axiom..."
export FM_AIRGAP_LICENSE_REQUIRED=1 HOST="$HOST_IP"
if [[ -f ship-build/protected/run.js ]]; then
  nohup node ship-build/protected/run.js >/tmp/mobility-axiom.log 2>&1 &
elif [[ -f run.js ]]; then
  nohup node run.js >/tmp/mobility-axiom.log 2>&1 &
elif [[ -f server.js ]]; then
  nohup node server.js >/tmp/mobility-axiom.log 2>&1 &
else
  echo "ERROR: No run.js / server.js found."
  exit 1
fi

echo ""
echo " ========================================================"
echo "  Mobility Axiom is now running at http://${HOST_IP}:3888"
echo " ========================================================"
echo ""
