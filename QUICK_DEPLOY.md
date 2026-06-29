# 🚀 QUICK DEPLOY (Render.com)

## 1 Langkah: Klik & Deploy

Buka ini di browser:
```
https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/weavy-credit-manager
```

## atau Manual Deploy

### Step 1: Create GitHub Repo
Buka: https://github.com/new
- Repository name: `weavy-credit-manager`
- Public/Private: Bebas
- Klik "Create repository"

### Step 2: Push ke GitHub

Di terminal server:
```bash
cd /home/ubuntu/auto-credit-manager

# Ganti USERNAME dengan GitHub username kamu
git remote add origin https://github.com/YOUR_USERNAME/weavy-credit-manager.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy di Render

1. Buka: https://render.com
2. Sign up dengan: `bagusadj22@gmail.com`
3. Klik "New +"
4. Pilih "Web Service"
5. Connect GitHub repo: `weavy-credit-manager`
6. Render auto-detect config (dari render.yaml)
7. Klik "Create Web Service"
8. Tunggu 2-3 menit

### Step 4: Buka App

App akan live di:
```
https://weavy-credit-manager.onrender.com
```

## Features yang sudah siap

✅ Auto-deploy setiap git push  
✅ HTTPS otomatis  
✅ Persistent storage (1GB)  
✅ Auto restart jika crash  
✅ Free tier 750 jam/bulan  

## Email untuk Signup

```
bagusadj22@gmail.com
```

## Kalau Render Penuh

Coba Railway.app:
```
https://railway.app/new
```
Login dengan email yang sama.

---

📁 Project: `/home/ubuntu/auto-credit-manager/`  
📦 Ready untuk push ke GitHub!