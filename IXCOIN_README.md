# IXCoin - Proof of Work Cryptocurrency

## Spesifikasi

| Parameter | Nilai |
|---|---|
| Algoritma | Proof of Work (SHA-256) |
| Total Supply | 12,000,000 IXC |
| Block Reward | 25 IXC |
| Halving Interval | 60,000 blok |
| Block Time | ~10 menit |
| First Block Reward | 9,000,000 IXC |
| Port P2P | 9883 |
| Port RPC | 9882 |

## Distribusi Koin

| Alokasi | Jumlah | Status |
|---|---|---|
| Wallet Utama (spendable) | 4,000,000 IXC | Langsung bisa digunakan |
| Vesting (terkunci) | 5,000,000 IXC | Terbuka bertahap 1 tahun |
| Mining Reward | 3,000,000 IXC | Ditambang lewat PoW |
| **Total** | **12,000,000 IXC** | |

## Jadwal Vesting

5,000,000 IXC terkunci dan dibuka bertahap setiap ~30 hari (4,380 blok):

| Tranche | Jumlah (IXC) | Terbuka di Blok | Estimasi Waktu |
|---|---|---|---|
| 1 | ~416,666 | 4,380 | Bulan ke-1 |
| 2 | ~416,666 | 8,760 | Bulan ke-2 |
| 3 | ~416,666 | 13,140 | Bulan ke-3 |
| 4 | ~416,666 | 17,520 | Bulan ke-4 |
| 5 | ~416,666 | 21,900 | Bulan ke-5 |
| 6 | ~416,666 | 26,280 | Bulan ke-6 |
| 7 | ~416,666 | 30,660 | Bulan ke-7 |
| 8 | ~416,666 | 35,040 | Bulan ke-8 |
| 9 | ~416,666 | 39,420 | Bulan ke-9 |
| 10 | ~416,666 | 43,800 | Bulan ke-10 |
| 11 | ~416,666 | 48,180 | Bulan ke-11 |
| 12 | ~416,666 | 52,560 | Bulan ke-12 |

Setelah blok 52,560, seluruh 5,000,000 IXC terbuka dan bisa digunakan.

## Build dari Source

### Persyaratan
- Ubuntu 20.04+ / Debian 11+
- GCC 9+ atau Clang 10+
- CMake 3.16+ atau Autotools
- Boost 1.71+
- OpenSSL 1.1+
- libevent 2.1+
- Berkeley DB 4.8+

### Compile

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential libtool autotools-dev automake \
    pkg-config libssl-dev libevent-dev bsdmainutils \
    libboost-system-dev libboost-filesystem-dev libboost-chrono-dev \
    libboost-test-dev libboost-thread-dev libdb-dev libdb++-dev \
    libzmq3-dev cmake

# Build
cd ixcoin
./autogen.sh
./configure --disable-tests --disable-bench --with-gui=no
make -j$(nproc)

# Install
sudo make install
```

## Deploy ke VPS

```bash
# Upload ke VPS
scp -r ixcoin/ user@your-vps-ip:/tmp/ixcoin

# Di VPS, jalankan installer
ssh user@your-vps-ip
cd /tmp/ixcoin
sudo bash deploy/install_vps.sh
```

Setelah instalasi:
```bash
# Start node
sudo systemctl start ixcoind

# Cek status
sudo systemctl status ixcoind

# Cek blockchain info
ixcoin-cli -conf=/home/ixcoin/.ixcoin/ixcoin.conf getblockchaininfo

# Cek vesting info
ixcoin-cli -conf=/home/ixcoin/.ixcoin/ixcoin.conf getvestinginfo
```

## Upload ke GitHub

```bash
cd ixcoin
git init
git add .
git commit -m "IXCoin: 12M supply, 25 IXC block reward, vesting schedule"
git remote add origin https://github.com/USERNAME/ixcoin.git
git push -u origin main
```

## RPC Commands

### getvestinginfo
Menampilkan informasi jadwal vesting:
```bash
ixcoin-cli getvestinginfo
```

Output:
```json
{
  "total_vesting_amount": 5000000.00000000,
  "spendable_immediately": 4000000.00000000,
  "vesting_periods": 12,
  "blocks_per_period": 4380,
  "current_height": 100,
  "total_vested": 0.00000000,
  "total_locked": 5000000.00000000,
  "tranches": [
    {
      "tranche": 1,
      "amount_ixc": 416666.66666667,
      "unlock_block": 4380,
      "status": "locked"
    }
  ]
}
```

### Mining
```bash
# Generate address
ixcoin-cli getnewaddress

# Mine block ke address
ixcoin-cli generatetoaddress 1 <address>

# Cek balance
ixcoin-cli getbalance
```

## File yang Dimodifikasi

| File | Perubahan |
|---|---|
| `src/amount.h` | MAX_MONEY = 12,000,000 IXC |
| `src/validation.h` | Default reward, halving, vesting constants |
| `src/validation.cpp` | Vesting enforcement logic |
| `src/chainparams.cpp` | Genesis block: 4M + 12x vesting outputs |
| `src/init.cpp` | Updated firstBlockReward limit |
| `src/rpc/blockchain.cpp` | Added `getvestinginfo` RPC command |

## Konfigurasi Wallet

Anda perlu menambahkan wallet address di parameter `-firstBlockGenesisLockScript` jika ingin mengunci reward blok pertama ke address tertentu.

## Lisensi

Distributed under the MIT software license.
