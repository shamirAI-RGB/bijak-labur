# Bijak Labur: panduan untuk Claude dan AI Agent

Laman bijaklabur.my (GitHub Pages, cawangan `main`) dan app Android/iOS (Capacitor). Semua teks pengguna dalam
**Bahasa Melayu baku Malaysia** (DBP), bukan Bahasa Indonesia: "daripada", "kerana", "wang", "boleh", "kerajaan".

## Struktur
- `index.html`: satu halaman. Setiap bahagian ialah `<section class="view" id="view-X">` dan dipaparkan oleh `[data-view="X"] #view-X` dalam `css/style.css`. Senarai `VIEWS` ada dalam `js/app.js` dan `js/boot.js` (kemas kini kedua-duanya).
- `js/*.js`: modul IIFE, dimuat dengan `defer`. Pembantu global daripada `js/app.js`: `$`, `$$`, `esc`, `icon`, `toast`, `store`.
- `css/*.css`: `css/rupa.css` dimuat paling akhir (lapisan rupa editorial).
- `sw.js`: service worker. **Naikkan `CACHE` (cth. v44 ke v45) dan tambah fail baharu ke senarai cache setiap kali js/css/html berubah.**
- Pelayan Cloudflare Workers, dipasang oleh GitHub Actions apabila `main` berubah:
  - `worker/`: Premium, akaun (Firebase + Durable Object), Suara HD (Azure)
  - `worker-fiqh/`: Tanya AI, `/semak`, `/kalori`, `/gambar` (FLUX), `/buku` (Buku Nota AI), `/kerja` (Kerjaya AI), `/manusia` (gaya AI). Gemini percuma, dengan penghala sandaran gaya 9Router (`src/penghala.js`: Groq, Cerebras, OpenRouter dan lain-lain, aktif hanya jika kuncinya ada dalam GitHub Secrets) dan akhirnya Workers AI apabila kuota Gemini habis. Studio Gambar beralih ke Together/Hugging Face jika kuota FLUX Workers AI habis
  - `worker-jadual/`: jadual UiTM
  - `worker-nota/`: kedai nota, 4 ruang iklan halaman utama (`/iklan`) dan teks laman yang diubah oleh pemilik (`/kandungan`)
  - `worker-agen/`: agen.bijaklabur.my melencong ke `pejabat-agen.html` (Pejabat AI Agent pemilik)
- `pejabat-agen.html`: Pejabat AI Agent (8 watak animasi yang memaparkan kerja sebenar daripada API GitHub awam: PR, commit, Actions, issue `pantau`), hanya untuk pemilik (kunci pemilik disemak melalui `nota.bijaklabur.my/admin/check`). Sumber React dalam `pejabat-agen/App.jsx`; bina dengan `node scripts/bina-pejabat-agen.mjs` (arahan pemasangan dalam fail itu). Jangan sunting `js/pejabat-agen.js` atau `css/pejabat-agen.css` secara terus.
- Mod Pemilik (`js/pemilik.js`): pemilik menyunting teks secara langsung. Kunci teks dijana daripada struktur (`<view>.judul`, `<view>.lead`, `<view>.kad.<href>.tajuk`, `<view>.<id h->`, `<view>.h2.<n>`, `<view>.nota.<n>`); jangan ubah susunan elemen ini tanpa sebab kerana teks yang disimpan pemilik bergantung padanya. Elemen ber-id (kecuali `h-...`) dan elemen yang mengandungi elemen lain tidak boleh disunting.

- Studio Skrin Kunci (`js/skrin-kunci.js`, `css/skrin-kunci.css`): butang "Skrin kunci" dalam Jadual menjana wallpaper jadual UiTM (templat Minggu sahaja buat masa ini, 7 hari, latar, susun atur; reka bentuk lain ditambah semula atas arahan pemilik apabila app sudah ada) dalam kanvas, tanpa pelayan. Data jadual datang daripada `Jadual.kunci()` dalam `js/jadual.js`; tarikh Hijri dan waktu solat dibaca daripada cache halaman Waktu Solat.

## Skill projek (`.claude/skills/`)
- `ui-ux-pro-max` (dan `design`, `design-system`, `ui-styling`, `brand`, `banner-design`, `slides`): panduan reka bentuk UI/UX. Untuk cadangan gaya, warna dan fon: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<pertanyaan>" --design-system`. Peraturan CSP dan "tiada AI slop" di atas tetap diutamakan.
- `graphify`: memetakan kod repo ini kepada graf pengetahuan (`/graphify .`). Ia memasang pakej PyPI `graphifyy` dan menulis ke `graphify-out/` (diabaikan oleh git).
- Kedua-duanya kod pihak ketiga (MIT dan Apache-2.0, lesen dalam setiap folder). Jangan jalankan skrip yang memerlukan kunci API luar tanpa arahan pemilik.

## Peraturan wajib
- **Keselamatan:**
  - CSP ketat dalam `<meta>`: tiada skrip atau gaya sebaris, tiada `onclick=`. API baharu perlu ditambah ke `connect-src`.
  - Data luar yang dimasukkan ke `innerHTML` mesti dibalut `esc()`.
  - Jangan tulis rahsia atau kunci dalam repo (ia disimpan sebagai GitHub Secrets).
  - Jangan longgarkan semakan asal (origin), had kadar, pengesahan token atau semakan bil.
- **Premium:**
  - `PAY_OPEN = true` dalam `js/premium.js` sejak 8 Oktober 2026 (arahan pemilik): bayaran ToyyibPay dibuka di web, jadi "percuma semasa pelancaran" tamat di web. `LAUNCH_FREE = true` masih membuka semua ciri dalam app sehingga produk kedai wujud. Jangan ubah tanpa arahan pemilik.
  - Log masuk telefon sengaja dimatikan.
- Jangan buang ciri sedia ada atau ubah reka bentuk secara besar-besaran tanpa arahan pemilik.
- Jangan sebut nama atau ID model AI dalam commit, PR atau kod.

## Ujian (jalankan sebelum setiap push)
```
node worker/test.mjs && node worker-nota/test.mjs && node worker-jadual/test.mjs && node worker-agen/test.mjs
(cd worker-fiqh && npm ci --silent && node test.mjs)
npx -y http-server . -p 8099 -s -c-1   # kemudian buka setiap #view dengan Playwright dan pastikan tiada pageerror
```
- Chromium untuk Playwright: `/opt/pw-browsers/chromium-*/chrome-linux/chrome`.
- Sandbox awan menyekat bijaklabur.my dan pelayan workers. Keadaan sebenar boleh dilihat dalam:
  - log GitHub Actions: `Pemantau` (setiap jam) dan langkah "Semak Gemini" dalam `fiqh.yml`;
  - issue berlabel `pantau`.

## AI Agent harian
- **Keutamaan kerja:**
  1. Issue `pantau` yang terbuka.
  2. Aliran kerja Actions yang gagal di `main`.
  3. Pepijat yang ditemui semasa audit (ralat konsol, pautan rosak, aksesibiliti, prestasi, kandungan salah).
  4. Satu penambahbaikan kecil yang jelas bermanfaat.
- **Cara menghantar kerja:**
  - Satu PR yang kemas ke `main`, dengan penerangan dalam Bahasa Melayu.
  - **Jangan merge sendiri.** Pemilik menyemak dan merge.
  - Jika tiada yang perlu dibaiki, jangan buka PR kosong.
- Jika kerosakan berpunca daripada perkhidmatan luar (cth. API waktu solat rosak), terangkan dalam ulasan issue. Jangan ubah kod tanpa sebab.
