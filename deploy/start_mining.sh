#!/bin/bash
set -e

CONF="/home/ixcoin/.ixcoin/ixcoin.conf"
CLI="ixcoin-cli -conf=$CONF"

if [ -z "$1" ]; then
    echo "Usage: $0 <wallet_address>"
    echo ""
    echo "Example: $0 1YourIXCoinAddressHere"
    echo ""
    echo "This will start solo mining to the specified address."
    exit 1
fi

WALLET_ADDRESS="$1"

echo "Checking node status..."
$CLI getblockchaininfo > /dev/null 2>&1 || {
    echo "Error: ixcoind is not running. Start it first:"
    echo "  sudo systemctl start ixcoind"
    exit 1
}

echo ""
echo "Node is running. Starting mining..."
echo "Mining address: $WALLET_ADDRESS"
echo ""

$CLI generatetoaddress 1 "$WALLET_ADDRESS"

echo ""
echo "Block mined successfully!"
echo ""
echo "Check balance:"
echo "  $CLI getbalance"
echo ""
echo "Check vesting info:"
echo "  $CLI getvestinginfo"
