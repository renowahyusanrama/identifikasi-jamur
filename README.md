<<<<<<< HEAD
# Identifikasi Jamur (MVP)

MVP web sederhana untuk mengidentifikasi jamur menggunakan iNaturalist Computer Vision. Unggah satu foto, klik **Identifikasi**, lalu aplikasi menampilkan nama lokal (jika ada) dan nama latin.

## Teknologi
- Next.js (App Router) + TypeScript
- API Route bawaan Next.js untuk backend
- Tidak ada database, file tidak disimpan permanen

## Menjalankan Secara Lokal
1. Siapkan Node.js 18.18+.
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env.local` berdasarkan `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   - `INAT_BASE_URL` (opsional, default `https://api.inaturalist.org/v1`)
   - `TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` (opsional). Jika diisi, CAPTCHA Cloudflare Turnstile akan aktif. Jika kosong, sistem tetap berjalan tanpa CAPTCHA.
4. Jalankan pengembang:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:3000`.

## API
- `POST /api/identify`
  - Body: `multipart/form-data` dengan `image` (file), `turnstileToken` (opsional).
  - Respons sukses: `{"localName": "string","latinName": "string"}`
  - Respons error: `{"error": "string"}`

## Proteksi
- Batas file: 8MB
- MIME: `image/jpeg`, `image/png`, `image/webp`
- Rate limit sederhana: 20 request per IP per 10 menit (in-memory)
- CAPTCHA Cloudflare Turnstile jika environment disediakan

## Catatan
- Hasil identifikasi bersifat perkiraan, bukan panduan konsumsi.
=======
# identifikasi-jamur
>>>>>>> dc5425e6138987b7c210c71ac0163d104135f38c
