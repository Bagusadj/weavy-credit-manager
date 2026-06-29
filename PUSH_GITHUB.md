# 🚀 Deploy ke Render.com

## Step 1: Push ke GitHub

### Option A: Via Terminal (Cepat)

```bash
cd /home/ubuntu/auto-credit-manager

# Ganti BAGUSADJ22 dengan GitHub username lu
export GITHUB_USER="BAGUSADJ22"

# Set remote
git remote add origin https://github.com/$GITHUB_USER/weavy-credit-manager.git

# Rename branch ke main
git branch -M main

# Push (akan minta GitHub password/token)
git push -u origin main
```

**Jika minta password:**
1. Buka https://github.com/settings/tokens
2. Create new token (classic) → Centang `repo` scope
3. Copy token tersebut
4. Saat push, paste token sebagai password

### Option B: Manual via GitHub UI

1. Buka https://github.com/new
2. Repo name: `weavy-credit-manager`
3. Public/Private sesuai preferensi
4. Click "Create repository"
5. Di terminal:
```bash
cd /home/ubuntu/auto-credit-manager
git remote add origin https://github.com/BAGUSADJ22/weavy-credit-manager.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy di Render.com

1. **Buka** https://render.com dan login/signup

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect repository: `weavy-credit-manager`
   - Atau paste URL repo GitHub lu

3. **Configure:**
   ```
   Name: weavy-credit-manager
   Region: Singapore (terdekat)
   Branch: main
   Root Directory: (kosongkan)
   Runtime: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && node server.js
   ```

4. **Instance Type:**
   - Pilih **Free** (untuk testing)
   - Atau Starter ($7/mo) untuk 24/7 uptime

5. **Environment Variables:**
   ```
   PORT = 3000
   NODE_ENV = production
   ```

6. **Advanced → Add Disk:**
   ```
   Name: data
   Mount Path: /opt/render/project/backend/data
   Size: 1 GB
   ```

7. **Click "Create Web Service"**

---

## Step 3: Akses Dashboard

Setelah deploy selesai (~2-5 menit):

```
https://weavy-credit-manager.onrender.com
```

atau custom domain jika lu setup.

---

## Troubleshooting

### Build Failed
- Cek log di Render dashboard
- Pastikan `backend/package.json` ada
- Verify `npm install` berhasil lokal

### Server Error 500
- Cek log Render: `Logs` tab
- Database path mungkin salah → pastikan disk mounted

### Free Tier Sleep
- Render free tier sleep setelah 15 menit idle
- Bangun otomatis saat ada request
- Upgrade ke Starter untuk 24/7

---

## Update Code Selanjutnya

```bash
# Setelah edit code
git add .
git commit -m "Fix: something"
git push
```

Render auto-deploy setiap push ke `main`.