#!/bin/bash
# IXCoin P2P AI Network — VPS Deploy Script
# Jalankan: chmod +x deploy.sh && ./deploy.sh

set -e

echo "======================================"
echo " IXCoin AI Layer — VPS Deployment"
echo "======================================"

if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

cd "$(dirname "$0")/ai-layer"

echo "Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "Building server..."
node build.mjs

echo ""
echo "======================================"
echo " Starting P2P AI Network..."
echo "======================================"

PORT=8080 NODE_TYPE=AI_NODE P2P_PORT=9080 node dist/index.mjs &
echo "AI Node 1: http://localhost:8080"
sleep 2

PORT=8081 NODE_TYPE=VALIDATOR_NODE P2P_PORT=9081 \
  INITIAL_PEERS=ws://localhost:9080 node dist/index.mjs &
echo "Validator: http://localhost:8081"
sleep 1

PORT=8082 NODE_TYPE=AI_NODE P2P_PORT=9082 \
  INITIAL_PEERS=ws://localhost:9080,ws://localhost:9081 node dist/index.mjs &
echo "AI Node 2: http://localhost:8082"

echo ""
echo "P2P Network ready!"
echo "Status: http://localhost:8080/api/p2p/status"
echo "Nodes:  http://localhost:8080/api/p2p/nodes"
echo "Tasks:  http://localhost:8080/api/p2p/tasks"
echo ""
wait
