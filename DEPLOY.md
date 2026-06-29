# Deploy ke Render.com (Hosting Gratis)

## Auto-Deploy Link

Klik link ini untuk deploy otomatis:
```
https://render.com/deploy?repo=https://github.com/USERNAME/weavy-credit-manager
```

Ganti USERNAME dengan GitHub username kamu.

## Manual Deploy (3 Langkah)

### 1️⃣ Push ke GitHub

```bash
cd /home/ubuntu/auto-credit-manager

# Create GitHub repo dulu di github.com/new
# Lalu:

git remote add origin https://github.com/USERNAME/weavy-credit-manager.git
git branch -M main
git push -u origin main
```

### 2️⃣ Buka Render.com

1. Sign up/Login: https://render.com
2. Klik "New +"
3. Pilih "Web Service"
4. Connect GitHub repo
5. Render otomatis detect config dari `render.yaml`

### 3️⃣ Selesai!

App akan live di:
```
https://weavy-credit-manager.onrender.com
```

## Config yang sudah disiapkan

✅ Procfile — command untuk start server  
✅ render.yaml — deployment config (1GB disk persistent)  
✅ .gitignore — exclude sensitive files  
✅ server.js — support PORT environment variable  

## Features di Render

- ✅ Free tier 750 jam/bulan
- ✅ Auto HTTPS
- ✅ Persistent disk (1GB)
- ✅ Auto restart jika crash
- ✅ Git push auto-deploy

## Alternatif: Railway.app

Kalau Render penuh, coba Railway:

```
https://railway.app/new
```

1. Connect GitHub
2. Pilih repo
3. Railway auto-detect Node.js
4. Deploy!

URL: `https://weavy-credit-manager.up.railway.app`

## Email untuk signup

```
bagusadj22@gmail.com
```

Gunakan email ini untuk register di Render/Railway.