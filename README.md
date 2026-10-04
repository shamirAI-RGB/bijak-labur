# Bijak Labur

Laman web + app (PWA) percuma: Akademi Moomoo, harga saham & kripto masa nyata, waktu solat seluruh Malaysia, dan penyemak kertas kerja pelajar.

## Struktur
- `index.html`: semua halaman (Utama, Belajar, Pasaran, Solat, Semak)
- `css/style.css`: reka bentuk (tema cerah/gelap automatik)
- `js/learn.js`: modul pembelajaran Moomoo, kalkulator, kuiz
- `js/market.js`: kripto masa nyata (Binance WebSocket, sandaran CoinGecko), carta lilin, amaran harga, widget saham TradingView
- `js/solat.js`: waktu solat zon JAKIM (api.waktusolat.app), kiraan detik, notifikasi azan, jadual bulanan
- `js/checker.js`: anggaran AI %, plagiarisme % (Wikipedia + teks sumber), pembetulan bahasa (peraturan BM/BI + LanguageTool)
- `manifest.webmanifest`, `sw.js`, `icons/`: supaya boleh dipasang sebagai app dan berfungsi luar talian

Semua API yang digunakan percuma dan tidak memerlukan kunci.

## Terbitkan percuma di GitHub Pages
1. Cipta repositori baharu di GitHub dan muat naik semua fail dalam folder ini.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root → Save.
3. Laman akan tersedia di `https://<nama-pengguna>.github.io/<repo>/`.

## App Android & iOS
Projek app asli dijana dengan Capacitor (`android/`, `ios/`) dan membungkus fail laman yang sama.
- `npm run sync`: salin laman ke `www/` dan kemas kini projek asli
- GitHub Actions `Android` membina APK (cuba terus) dan AAB (Google Play)
- GitHub Actions `iOS` menyemak binaan dan, jika rahsia App Store Connect ada, memuat naik ke TestFlight
- `npm run solat-data`: muat turun data waktu solat sandaran ke `data/solat/`

## Uji di komputer
```
npx http-server .
```
Kemudian buka http://localhost:8080 (service worker memerlukan http/https, bukan file://).

## Nota
- Peratus AI dan plagiarisme ialah anggaran heuristik, bukan pengganti Turnitin.
- Kandungan pelaburan untuk pendidikan sahaja, bukan nasihat kewangan.

## Premium (laman web sahaja)

Pelan berbayar Pelajar, Pelabur dan Lengkap dijual melalui ToyyibPay (FPX dan kad). Pelayan pembayaran kecil dalam `worker/` berjalan di Cloudflare Workers (percuma) dan dipasang oleh `.github/workflows/worker.yml` apabila rahsia ditetapkan. Ia mencipta bil, mengesahkan bayaran dengan ToyyibPay, dan memberikan lesen bertandatangan (ECDSA P-256) yang disahkan dalam peranti oleh `js/premium.js`. Dalam app Android dan iOS, Premium disembunyikan kerana peraturan kedai app.

- Ujian pelayan: `node worker/test.mjs`
- Kunci lesen baharu: `node scripts/gen-license-key.mjs`

## Jadual kelas UiTM

Halaman `#jadual` (`js/jadual.js`, `css/jadual.css`) membina jadual mingguan pelajar UiTM daripada senarai awam iCress mengikut kampus, kod kursus dan kumpulan. Cara paling cepat ialah No. Pelajar: pelayan membaca fail jadual pelajar awam UiTM (`cdn.uitm.link/jadual/baru/<No. Pelajar>.json`, sumber yang sama digunakan oleh penjana jadual lain) tanpa kata laluan, dan jawapannya tidak disimpan dalam cache. Pelajar juga boleh membina jadual sendiri ikut kampus, kursus dan kumpulan, atau menampal teks dari MyStudent. Jadual disimpan dalam peranti, boleh dicetak dan disimpan ke kalendar telefon (.ics).

Pelayan kecil dalam `worker-jadual/` (Cloudflare Workers, percuma) membaca iCress dan menghantar JSON dengan CORS di `https://jadual.bijaklabur.my`. Ia dipasang oleh `.github/workflows/jadual.yml` apabila rahsia `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` ditetapkan.

- Ujian pelayan: `node worker-jadual/test.mjs`

## Tanya AI Fiqh

Pelayan `worker-fiqh/` (Cloudflare Workers) menjawab soalan fiqh dengan rujukan yang disemak, di `https://fiqh.bijaklabur.my`. Ia dipasang oleh `.github/workflows/fiqh.yml`.

- Rahsia `GEMINI_API_KEY` (percuma, dari Google AI Studio): jawapan bersandarkan korpus rujukan Bijak Labur dan ayat Al-Quran sahaja.
- Rahsia `ANTHROPIC_API_KEY` (berbayar): Claude juga boleh membuka Shamela, quran.com, sunnah.com dan laman mufti semasa menjawab. Jika kedua-dua kunci ada, Claude digunakan.
- Ujian pelayan: `node worker-fiqh/test.mjs` (selepas `npm ci` dalam `worker-fiqh/`)
