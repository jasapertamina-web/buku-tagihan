# Buku Tagihan — Panduan Membuat Versi Nyata

Ikuti urutan ini persis. Semua bisa dikerjakan lewat browser HP/laptop, tanpa install software.

## Bagian 1 — Buat "gudang data" online (Firebase, gratis)

1. Buka https://console.firebase.google.com, login pakai akun Google.
2. Klik "Add project" → beri nama bebas (mis. "buku-tagihan") → lanjutkan sampai selesai (matikan Google Analytics kalau ditawarkan, tidak perlu).
3. Di dashboard project, klik ikon "</>" (Web) untuk mendaftarkan aplikasi web → beri nama apa saja → Register app.
4. Firebase akan menampilkan kode berisi `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`. Salin semua nilai itu.
5. Buka file `src/firebaseConfig.js` di folder ini, ganti semua nilai "GANTI..." dengan nilai yang Anda salin tadi. Simpan.
6. Di menu kiri Firebase, klik "Firestore Database" → "Create database" → pilih "Start in test mode" → pilih lokasi server terdekat (mis. asia-southeast) → Enable.
   - Catatan: mode "test" berarti data bisa dibaca/ditulis siapa saja yang tahu alamatnya, dan otomatis terkunci setelah 30 hari. Untuk pemakaian jangka panjang, nanti perlu diatur ulang aturan keamanannya (Firestore Rules) — bisa minta bantuan developer atau Claude Code untuk ini.

## Bagian 2 — Unggah proyek ke GitHub

1. Buka https://github.com, buat akun gratis kalau belum punya.
2. Klik "+" di kanan atas → "New repository" → beri nama (mis. "buku-tagihan") → Create repository.
3. Di halaman repo kosong, klik "uploading an existing file".
4. Seret (drag & drop) SEMUA file dan folder dari hasil ekstrak zip ini (termasuk folder `src` dan `public`) ke halaman itu.
5. Klik "Commit changes".

## Bagian 3 — Publikasikan lewat Vercel (gratis)

1. Buka https://vercel.com, klik "Sign up" → pilih "Continue with GitHub" supaya otomatis terhubung.
2. Di dashboard Vercel, klik "Add New" → "Project".
3. Pilih repository "buku-tagihan" yang tadi dibuat → klik "Import".
4. Biarkan semua pengaturan default (Vercel otomatis mengenali ini proyek Vite) → klik "Deploy".
5. Tunggu 1-2 menit. Setelah selesai, Vercel memberi Anda sebuah link (mis. `buku-tagihan.vercel.app`) — ini alamat website Anda yang sudah bisa diakses siapa saja.

## Bagian 4 — Pakai di HP Android sebagai aplikasi

1. Buka link Vercel tadi di Chrome HP Android.
2. Ketuk menu titik tiga (⋮) di pojok kanan atas Chrome → "Add to Home screen" / "Install app".
3. Ikon aplikasi akan muncul di layar HP seperti aplikasi biasa.
4. Admin bisa buka link yang sama dari laptop/komputer untuk memantau lewat "website kontrol".

## Yang perlu diingat

- Semua Admin & Penagih memakai LINK YANG SAMA — peran ditentukan dari pilihan di layar awal aplikasi, bukan dari link berbeda.
- Data tersimpan di Firebase, jadi berubah di satu HP akan langsung terlihat di HP/laptop lain yang membuka aplikasi yang sama.
- Belum ada password sungguhan per orang — siapa pun yang tahu link bisa memilih peran apa saja. Kalau mau ditambah login aman (email + password per penagih), itu langkah pengembangan berikutnya.
