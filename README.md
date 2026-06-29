# Weavy Bulk Credit Manager

Web app untuk manage banyak akun Weavy dengan credit pooling.

## Fitur

✅ Bulk login dari file .txt
✅ Auto-sync credit dari semua akun
✅ Total credit gabung
✅ Auto-deduct saat generate
✅ Pilih model generate di web
✅ Track usage history

## Cara Install

1. Install Node.js dependencies:
```bash
cd backend
npm install
```

2. Start server:
```bash
npm start
```

3. Buka browser:
```
http://localhost:3000
```

## Format File .txt

Support 2 format:
- `email:password`
- `email:password:api_key`

Contoh:
```
user1@example.com:password123
user2@example.com:password456:abc123def456
user3@example.com:password789
```

## API Endpoints

### POST /api/accounts/bulk-upload
Upload file .txt dengan akun

### GET /api/accounts
Get semua akun + total credit

### POST /api/accounts/sync
Sync credit semua akun

### POST /api/generate
Generate gambar (auto-deduct credit)

### GET /api/usage
Get history penggunaan

### GET /api/models
Get list model yang tersedia

## Struktur Project

```
auto-credit-manager/
├── backend/
│   ├── server.js          # Express server
│   ├── package.json       # Dependencies
│   ├── data/
│   │   └── credits.db     # SQLite database
│   └── uploads/           # Temp upload files
└── frontend/
    ├── index.html         # Dashboard UI
    ├── styles.css         # Styling
    └── app.js             # Frontend logic
```

## Deploy

### Local Development
```bash
cd backend
npm install
npm start
```

### Production (VPS)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone project
cd /var/www
git clone <repo-url>
cd auto-credit-manager/backend

# Install dependencies
npm install

# Start with PM2
npm install -g pm2
pm2 start server.js --name weavy-manager
pm2 save
pm2 startup
```

### Nginx Reverse Proxy
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

## Troubleshooting

### Port 3000 sudah dipakai
Ganti port di `backend/server.js`:
```javascript
const PORT = 3001; // atau port lain
```

### Database error
Hapus database lama:
```bash
rm backend/data/credits.db
# Restart server
```

### Weavy API error
Cek:
- Email/password benar
- API key valid
- Koneksi internet OK

## License

Free to use - BYO Weavy accounts

## Catatan

- Ini tool untuk manage akun sendiri (bukan hack)
- Weavy API endpoint: `https://api.weavy.ai`
- Credit dihitung per generate tergantung model
- SQLite database - auto-backup recommended untuk production