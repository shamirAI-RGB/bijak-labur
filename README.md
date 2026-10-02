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
