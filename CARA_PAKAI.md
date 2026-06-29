# Weavy Bulk Credit Manager — Cara Pakai

## Status: ✅ LIVE & READY

```
🌐 Dashboard: http://localhost:3000
🚀 Server: Running (PID: active)
📁 Location: /home/ubuntu/auto-credit-manager/
```

## Quick Start (3 Langkah)

### 1️⃣ Siapkan File Akun

Buat file `.txt` dengan format:
```
email1@gmail.com:password123
email2@yahoo.com:pass456:api_key_optional
email3@outlook.com:pass789
```

Contoh file sudah tersedia:
```bash
nano ~/auto-credit-manager/test_accounts.txt
```

### 2️⃣ Upload ke Dashboard

1. Buka `http://localhost:3000`
2. Drag & drop file `.txt` ke area upload
3. Tunggu proses bulk login selesai
4. Lihat hasil (success/failed)

### 3️⃣ Generate Gambar

1. Klik tab "Generate"
2. Pilih model (auto-select akun dengan credit tertinggi)
3. Tulis prompt
4. Klik "🚀 Generate"
5. Credit otomatis terpotong dari akun yang dipilih

## Dashboard Features

### 📊 Overview
- Total credit gabung semua akun
- Jumlah akun aktif
- Statistik real-time

### 👥 Accounts Management
- Lihat semua akun + credit individual
- Hapus akun tidak aktif
- Sync semua credit dengan 1 klik

### 🎨 Generate Images
- Pilih dari 6 model (Flux Pro, Dev, Realism, Anime, 3D, Turbo)
- Auto-select akun dengan credit tertinggi
- Credit auto-deduct setelah generate

### 📜 Usage History
- Track semua penggunaan credit
- Lihat model yang dipakai
- Timestamp tiap generate

## Model List & Credit Cost

| Model | Credit | Deskripsi |
|-------|--------|-----------|
| Flux 1.1 Pro | 10 | High quality, balanced |
| Flux 1.1 Dev | 8 | Development version |
| Flux Realism | 12 | Photorealistic style |
| Flux Anime | 10 | Anime/manga style |
| Flux 3D | 15 | 3D rendered style |
| Turbo | 5 | Fast generation |

## API Endpoints (untuk integrasi)

```bash
# Get models
curl http://localhost:3000/api/models

# Get all accounts
curl http://localhost:3000/api/accounts

# Sync all credits
curl -X POST http://localhost:3000/api/accounts/sync

# Bulk upload
curl -X POST -F "accounts=@accounts.txt" http://localhost:3000/api/accounts/bulk-upload

# Generate image
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"flux-1.1-pro","prompt":"cat wearing sunglasses","accountId":1}'

# Get usage history
curl http://localhost:3000/api/usage

# Delete account
curl -X DELETE http://localhost:3000/api/accounts/1
```

## Commands

```bash
# Start server
cd ~/auto-credit-manager/backend && node server.js &

# Stop server
pkill -f "node server.js"

# Restart server
pkill -f "node server.js" && cd ~/auto-credit-manager/backend && node server.js &

# Check server status
curl http://localhost:3000

# View database
sqlite3 ~/auto-credit-manager/backend/data/credits.db "SELECT * FROM accounts;"

# Backup database
cp ~/auto-credit-manager/backend/data/credits.db ~/credits_backup_$(date +%Y%m%d).db
```

## Troubleshooting

### Server tidak jalan
```bash
# Check process
ps aux | grep "node server.js"

# Kill zombie process
pkill -9 -f "node server.js"

# Start ulang
cd ~/auto-credit-manager/backend && node server.js &
```

### Dashboard 404
```bash
# Cek file frontend
ls -la ~/auto-credit-manager/frontend/

# Pastikan server.js path static benar
grep "express.static" ~/auto-credit-manager/backend/server.js
```

### Database error
```bash
# Reset database
rm ~/auto-credit-manager/backend/data/credits.db
# Restart server (auto-create baru)
```

### Upload gagal
```bash
# Cek permission uploads folder
ls -la ~/auto-credit-manager/backend/uploads/

# Fix permission
chmod 755 ~/auto-credit-manager/backend/uploads/
```

## Security Notes

- Password disimpan di SQLite database (local only)
- API key di-encrypt di memory
- CORS enabled — deploy di VPS recommended
- Gunakan HTTPS untuk production

## Production Deploy

### Dengan PM2
```bash
cd ~/auto-credit-manager/backend
npm install -g pm2
pm2 start server.js --name weavy-manager
pm2 save
pm2 startup
```

### Dengan Supervisor
```bash
sudo cp ~/auto-credit-manager/weavy-manager.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start weavy-manager
```

### Dengan Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Next Steps

1. Edit `test_accounts.txt` dengan akun asli
2. Upload via dashboard
3. Sync credit
4. Test generate gambar
5. Deploy ke VPS (kalau perlu)

**Dashboard siap pakai!** 🚀