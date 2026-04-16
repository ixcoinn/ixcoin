#!/bin/bash
# ============================================================
# IXCoin — Deploy / Update Script (run on VPS)
# Usage: bash deploy.sh
# ============================================================
set -e

APP_DIR="/opt/ixcoin"
SERVICE_NAME="ixcoin-api"

echo "=============================="
echo "IXCoin Deploy Starting..."
echo "=============================="

cd $APP_DIR

# ── Install / update dependencies
echo "[1/4] Installing dependencies..."
pnpm install --frozen-lockfile

# ── Run DB migrations
echo "[2/4] Pushing database schema..."
pnpm --filter @workspace/db run push

# ── Build API server
echo "[3/4] Building API server..."
pnpm --filter @workspace/api-server run build

# ── Restart service
echo "[4/4] Restarting service..."
systemctl restart $SERVICE_NAME
sleep 3
systemctl status $SERVICE_NAME --no-pager

echo ""
echo "✅ Deploy complete!"
echo "   API: http://$(hostname -I | awk '{print $1}')/api/ai/monitor/status"
echo ""
