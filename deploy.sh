#!/usr/bin/env bash
set -euo pipefail

echo "=== IXCoin AI Layer + Blockchain — Deploy Script ==="

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in values."
  exit 1
fi

echo "[1/5] Pulling latest changes..."
git pull 2>/dev/null || true

echo "[2/5] Building Docker images..."
docker compose build --no-cache

echo "[3/5] Starting services..."
docker compose up -d

echo "[4/5] Waiting for DB to be ready..."
sleep 5

echo "[5/5] Running migrations..."
docker compose exec ai-layer npm run db:push --prefix lib/db 2>/dev/null || \
  docker compose exec ai-layer sh -c "cd lib/db && npx drizzle-kit push" || \
  echo "WARNING: Migration failed — run manually"

echo ""
echo "=== Deployed Successfully ==="
echo "API Layer: http://localhost:3000"
echo "Health:    http://localhost:3000/health"
echo ""
echo "API Endpoints:"
echo "  GET  /api/wallet/status/:address"
echo "  POST /api/wallet/register"
echo "  POST /api/wallet/claim/free"
echo "  POST /api/wallet/claim/vesting"
echo "  GET  /api/civilization/state"
echo "  GET  /api/civilization/live"
