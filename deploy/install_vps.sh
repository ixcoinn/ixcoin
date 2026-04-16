#!/bin/bash
set -e

echo "=========================================="
echo " IXCoin Node - VPS Installation Script"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash install_vps.sh"
    exit 1
fi

echo "[1/6] Updating system packages..."
apt-get update -y
apt-get upgrade -y

echo "[2/6] Installing build dependencies..."
apt-get install -y \
    build-essential \
    libtool \
    autotools-dev \
    automake \
    pkg-config \
    libssl-dev \
    libevent-dev \
    bsdmainutils \
    libboost-system-dev \
    libboost-filesystem-dev \
    libboost-chrono-dev \
    libboost-test-dev \
    libboost-thread-dev \
    libdb-dev \
    libdb++-dev \
    libzmq3-dev \
    cmake \
    git \
    wget \
    curl \
    ufw

echo "[3/6] Creating ixcoin user..."
if ! id "ixcoin" &>/dev/null; then
    useradd -m -s /bin/bash ixcoin
    echo "User 'ixcoin' created."
else
    echo "User 'ixcoin' already exists."
fi

echo "[4/6] Building IXCoin from source..."
IXCOIN_DIR="/home/ixcoin/ixcoin-src"
if [ -d "$IXCOIN_DIR" ]; then
    rm -rf "$IXCOIN_DIR"
fi

cp -r "$(dirname "$0")/.." "$IXCOIN_DIR"
chown -R ixcoin:ixcoin "$IXCOIN_DIR"

cd "$IXCOIN_DIR"
if [ -f "autogen.sh" ]; then
    sudo -u ixcoin bash autogen.sh
    sudo -u ixcoin ./configure --disable-tests --disable-bench --with-gui=no
    sudo -u ixcoin make -j$(nproc)
else
    mkdir -p build && cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF
    make -j$(nproc)
fi

echo "[5/6] Installing binaries..."
make install 2>/dev/null || cp src/ixcoind src/ixcoin-cli /usr/local/bin/ 2>/dev/null || true

echo "[6/6] Setting up configuration..."
IXCOIN_DATA="/home/ixcoin/.ixcoin"
mkdir -p "$IXCOIN_DATA"

if [ ! -f "$IXCOIN_DATA/ixcoin.conf" ]; then
    RPC_USER="ixcoinrpc"
    RPC_PASS=$(openssl rand -hex 32)

    cat > "$IXCOIN_DATA/ixcoin.conf" << EOF
server=1
daemon=1
txindex=1

rpcuser=$RPC_USER
rpcpassword=$RPC_PASS
rpcallowip=127.0.0.1
rpcport=9882

port=9883

maxconnections=64
dbcache=512

listen=1
discover=1

addnode=seed1.ixcoin.com
addnode=seed2.ixcoin.com

printtoconsole=0
debug=0
EOF

    echo ""
    echo "RPC credentials saved to $IXCOIN_DATA/ixcoin.conf"
    echo "  RPC User: $RPC_USER"
    echo "  RPC Pass: $RPC_PASS"
fi

chown -R ixcoin:ixcoin "$IXCOIN_DATA"

echo ""
echo "Setting up systemd service..."
cat > /etc/systemd/system/ixcoind.service << 'EOF'
[Unit]
Description=IXCoin Node
After=network.target

[Service]
User=ixcoin
Group=ixcoin
Type=forking
ExecStart=/usr/local/bin/ixcoind -daemon -conf=/home/ixcoin/.ixcoin/ixcoin.conf -datadir=/home/ixcoin/.ixcoin
ExecStop=/usr/local/bin/ixcoin-cli -conf=/home/ixcoin/.ixcoin/ixcoin.conf stop
Restart=on-failure
RestartSec=30
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ixcoind

echo ""
echo "Setting up firewall..."
ufw allow 9883/tcp
ufw allow 22/tcp
ufw --force enable

echo ""
echo "=========================================="
echo " Installation Complete!"
echo "=========================================="
echo ""
echo " Start the node:  sudo systemctl start ixcoind"
echo " Stop the node:   sudo systemctl stop ixcoind"
echo " Check status:    sudo systemctl status ixcoind"
echo " View logs:       tail -f /home/ixcoin/.ixcoin/debug.log"
echo " CLI access:      ixcoin-cli -conf=/home/ixcoin/.ixcoin/ixcoin.conf getblockchaininfo"
echo " Vesting info:    ixcoin-cli -conf=/home/ixcoin/.ixcoin/ixcoin.conf getvestinginfo"
echo ""
echo " Config file: $IXCOIN_DATA/ixcoin.conf"
echo ""
