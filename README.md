# DIMSum-BPS — Cara Menjalankan Server Lokal

Proyek ini menggunakan dua server saat pengembangan:
- API Node.js di `android/server` (port default: `7000`)
- Server statik untuk aset web di `android/app/src/main/assets/public` (port default: `8000`)

## Prasyarat
- Node.js 18+ dan npm
- Python 3+
- Git (untuk cloning/pull)
- Opsional: `npx browser-sync` untuk live reload

## Langkah Cepat (Windows/Mac/Linux)
1) Jalankan API Server (Node.js):
```bash
cd android/server
npm install
node server.js
# API tersedia di http://localhost:7000/api
```

2) Jalankan Server Statik (Python):
```bash
cd android/app/src/main/assets/public
python dev_server.py --host 127.0.0.1 --port 8000
# Aset statik tersedia di http://127.0.0.1:8000/
```

3) Buka Aplikasi Admin:
- `http://127.0.0.1:8000/page/admin/login.html`
- Setelah login, halaman admin: `http://127.0.0.1:8000/page/admin/index.html`

## Rute & Port Penting
- Base API: `http://localhost:7000/api` (digunakan oleh `page/admin/js/apiClient.js`)
- Contoh endpoint:
  - `GET /api/tbuser`
  - `GET /api/infografis`
  - `GET /api/tbstatistik`

## Upload & File Statik
- Infografis:
  - Disimpan otomatis ke `android/app/src/main/assets/public/sqlite/infografis`
  - URL yang disimpan: `/sqlite/infografis/<filename>`
- Statistik (Excel):
  - Disimpan otomatis ke `android/app/src/main/assets/public/sqlite/TBSexcel`
  - URL yang disimpan: `/sqlite/TBSexcel/<filename>`
- Database SQLite lokal:
  - `android/app/src/main/assets/public/sqlite/dimsum.db`
  - Dibaca oleh frontend (via `sqliteClient.js`) dari path `/sqlite/dimsum.db`

## Live Reload (Opsional)
Jika ingin auto-refresh saat file berubah tanpa mengubah arsitektur:
```bash
# Jalankan dev_server.py seperti biasa (port 8000), lalu:
npx browser-sync start --proxy "http://127.0.0.1:8000" --files "android/app/src/main/assets/public/**/*" --port 3000
# Akses di http://localhost:3000/page/admin/login.html
```

## Satu Klik di Windows (Opsional)
Buat file `start-dev.bat` di folder `android/` dengan isi:
```bat
@echo off
start cmd /k "cd /d %~dp0\server && node server.js"
start cmd /k "cd /d %~dp0\app\src\main\assets\public && py -3 dev_server.py --host 127.0.0.1 --port 8000"
```
Double-click `start-dev.bat` untuk menyalakan kedua server sekaligus.

## Troubleshooting
- Port bentrok:
  - API: `set PORT=7001 && node server.js` (Windows) atau `PORT=7001 node server.js` (Mac/Linux)
  - Statik: `python dev_server.py --port 8001`
- "Cannot GET" saat mengakses gambar/Excel:
  - Pastikan file ada di `public/sqlite/infografis` atau `public/sqlite/TBSexcel`.
  - Pastikan tautan menggunakan jalur `/sqlite/infografis/<file>` atau `/sqlite/TBSexcel/<file>`.
- Gagal memuat SQLite (`dimsum.db`):
  - Pastikan file berada di `android/app/src/main/assets/public/sqlite/dimsum.db`.
- CORS:
  - API Node.js sudah mengaktifkan `cors()`.
  - Server statik menambahkan header CORS, akses via `localhost`/`127.0.0.1`.

## Catatan
- Instruksi ini untuk mode pengembangan lokal. Build APK Android mengikuti proses Gradle terpisah dan tidak dibahas di sini.
