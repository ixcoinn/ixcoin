# IXCoin AI Layer — Deploy Guide (VPS + GitHub)

## Quick Deploy to VPS

### Prerequisites
- VPS running Ubuntu 20.04+ or Debian 11+
- Docker + Docker Compose installed
- Port 3000 (API) dan 9080 (P2P) open di firewall

### 1. Clone from GitHub
```bash
git clone https://github.com/YOUR_USERNAME/ixcoin.git
cd ixcoin/ai-layer
```

### 2. Setup environment
```bash
cp .env.example .env
nano .env
```

Wajib diisi:
- SESSION_SECRET — string acak minimal 32 karakter
- POSTGRES_PASSWORD — password database yang kuat

Opsional:
- NODE_ID — ID node (auto-generate jika kosong)
- INITIAL_PEERS — daftar peer pertama, contoh: ws://peer1.com:9080

### 3. Deploy dengan Docker Compose
```bash
docker compose up -d
docker compose logs -f ai-node
```

### 4. Verifikasi
```bash
curl http://localhost:3000/api/healthz
```

---

## Push ke GitHub

```bash
git init
git add .
git commit -m "feat: IXCoin AI Layer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ixcoin.git
git push -u origin main
```

---

## API Endpoints

| Method | Endpoint                    | Deskripsi                               |
|--------|-----------------------------|-----------------------------------------|
| GET    | /api/healthz                | Health check                            |
| POST   | /api/wallet/register        | Daftarkan wallet (dapat alokasi 4M IXC) |
| GET    | /api/wallet/status/:address | Cek status alokasi wallet               |
| POST   | /api/wallet/claim/free      | Klaim 2M IXC langsung                   |
| POST   | /api/wallet/claim/vesting   | Klaim 2M IXC vesting (setelah 1 tahun)  |
| GET    | /api/ai/instances           | Daftar AI instances                     |
| POST   | /api/ai/instances           | Buat AI instance baru                   |
| GET    | /api/civilization/live      | Status civilisasi AI live               |

---

## Keamanan yang Ditambahkan

- Rate limiting pada semua endpoint (anti-spam, anti-DDoS)
- Security headers (XSS, clickjacking, MIME sniffing protection)
- Input sanitization (prototype pollution prevention)
- Body size limit (1MB max)
- Safe error messages (tidak bocorkan internal error di production)
- CORS restriction (configurable via ALLOWED_ORIGINS)
- Non-root user di Docker container
- Database connection pooling dengan limit
- Wallet address format validation
