#!/bin/bash
# ============================================================
# IXCoin AI Life Layer — VPS Setup Script
# Tested on: Ubuntu 22.04 LTS / Debian 12
# Run as root: bash setup-vps.sh
# ============================================================
set -e

APP_USER="ixcoin"
APP_DIR="/opt/ixcoin"
NODE_VERSION="24"

echo "=============================="
echo "IXCoin VPS Setup Starting..."
echo "=============================="

# ── 1. Update system
echo "[1/8] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install dependencies
echo "[2/8] Installing dependencies..."
apt-get install -y -qq curl git nginx postgresql postgresql-contrib ufw

# ── 3. Install Node.js 24
echo "[3/8] Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
npm install -g pnpm

# ── 4. Setup PostgreSQL
echo "[4/8] Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql
su - postgres -c "psql -c \"CREATE USER ixcoin WITH PASSWORD 'ixcoindb_change_me';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE ixcoin OWNER ixcoin;\"" 2>/dev/null || true
echo "✓ PostgreSQL: database 'ixcoin' ready"

# ── 5. Create app user
echo "[5/8] Creating app user..."
id -u $APP_USER &>/dev/null || useradd -m -s /bin/bash $APP_USER
echo "✓ User '$APP_USER' ready"

# ── 6. Clone / copy project
echo "[6/8] Setting up application directory..."
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

# If running from a git clone:
# git clone https://github.com/YOUR_ORG/ixcoin.git $APP_DIR
# OR copy your local files:
# rsync -av /path/to/ixcoin/ $APP_DIR/
echo "  → Copy your project files to $APP_DIR"
echo "    e.g.: rsync -av ./ root@YOUR_VPS_IP:$APP_DIR/"

# ── 7. Setup environment
echo "[7/8] Creating .env file..."
cat > $APP_DIR/.env <<'ENVEOF'
# ─── Database ───────────────────────────────────────────────
DATABASE_URL=postgresql://ixcoin:ixcoindb_change_me@localhost:5432/ixcoin

# ─── Session ────────────────────────────────────────────────
SESSION_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET_32_CHARS_MIN

# ─── IXCoin Node RPC (your local ixcoind) ───────────────────
IXCOIN_RPC_URL=http://127.0.0.1:8332
IXCOIN_RPC_USER=ixcoinrpc
IXCOIN_RPC_PASS=REPLACE_WITH_YOUR_RPC_PASSWORD

# ─── AI Life Layer ──────────────────────────────────────────
AI_POLL_INTERVAL_MS=30000

# ─── Server ─────────────────────────────────────────────────
NODE_ENV=production
PORT=8080
ENVEOF

chown $APP_USER:$APP_USER $APP_DIR/.env
chmod 600 $APP_DIR/.env
echo "✓ .env created at $APP_DIR/.env — EDIT THIS FILE before starting"

# ── 8. Firewall
echo "[8/8] Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8332/tcp comment "IXCoin RPC"
ufw allow 8333/tcp comment "IXCoin P2P"
echo "✓ UFW firewall configured"

echo ""
echo "=============================================="
echo "✅  VPS setup complete!"
echo "=============================================="
echo ""
echo "NEXT STEPS:"
echo "  1. Copy your project files to $APP_DIR"
echo "     rsync -av ./ root@YOUR_VPS_IP:$APP_DIR/"
echo ""
echo "  2. Edit the .env file:"
echo "     nano $APP_DIR/.env"
echo ""
echo "  3. Install dependencies and push DB schema:"
echo "     cd $APP_DIR && pnpm install"
echo "     pnpm --filter @workspace/db run push"
echo ""
echo "  4. Install systemd service:"
echo "     cp $APP_DIR/deploy/ixcoin-api.service /etc/systemd/system/"
echo "     systemctl daemon-reload"
echo "     systemctl enable ixcoin-api"
echo "     systemctl start ixcoin-api"
echo ""
echo "  5. Setup nginx:"
echo "     cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/ixcoin"
echo "     ln -sf /etc/nginx/sites-available/ixcoin /etc/nginx/sites-enabled/"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  6. Check status:"
echo "     systemctl status ixcoin-api"
echo "     journalctl -u ixcoin-api -f"
echo ""
