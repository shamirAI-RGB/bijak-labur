# Panduan Pusat Kawalan (pusat.bijaklabur.my)

Pusat Kawalan menunjukkan **pelawat yang sedang melayari laman**, **penggunaan token AI** setiap ciri, **kesihatan pelayan**,
dan menyediakan **agen AI** yang boleh diarahkan melalui **Telegram** atau dari papan itu sendiri.

Papan: <https://bijaklabur.my/pusat.html> (masuk dengan kunci Mod Pemilik yang sama). Juga dalam menu Mod Pemilik.

## Apa yang berfungsi tanpa apa-apa rahsia baharu
Selepas PR ini di-merge, GitHub Actions memasang `worker-pusat` dengan rahsia Cloudflare sedia ada:
- pelawat langsung, pelawat harian 30 hari, halaman popular, negara, peranti (laman menghantar denyut tanpa nama);
- semakan kesihatan setiap 15 minit;
- arahan pantas agen di papan (`/stat`, `/sihat`, `/pr`, `/actions`, `/issue`, `/laporan`).

## Rahsia GitHub (repo > Settings > Secrets and variables > Actions > New repository secret)

| Rahsia | Untuk apa | Cara dapat |
|---|---|---|
| `PUSAT_SECRET` | Kiraan token AI. Pelayan Tanya AI (worker-fiqh) melaporkan token ke pusat dengan kunci ini. | Rentetan rawak panjang (30+ aksara), cth. jana di terminal: `openssl rand -hex 24`. Satu nilai, dibaca oleh dua worker. |
| `TELEGRAM_BOT_TOKEN` | Agen Telegram. | Telegram > cari `@BotFather` > `/newbot` > beri nama (cth. "SiswaCap Pusat") dan username (cth. `SiswaCapPusatBot`) > salin token `123456:ABC-...`. |
| `ANTHROPIC_API_KEY` | Agen menjawab dengan Claude (lebih pintar; alat penuh). Sudah digunakan oleh worker-fiqh jika ada. | console.anthropic.com (organisasi "Bijak Labur"). |
| `GEMINI_API_KEY` | Sandaran percuma untuk agen jika kunci Claude tiada. Sudah ada untuk worker-fiqh. | Google AI Studio. |
| `AGEN_GITHUB_TOKEN` (pilihan) | Agen boleh **membuka issue "arahan"** (arahan anda dari Telegram menjadi kerja AI Agent harian) dan membaca Actions tanpa had kadar awam. | github.com > Settings > Developer settings > Fine-grained token > repo `bijak-labur` sahaja > Issues: Read and write, Actions: Read, Contents: Read. |
| `TELEGRAM_CHAT_ID` (pilihan) | Kunci sembang pemilik secara tetap. Tanpa ini, berpasangan sekali dengan `/mula <kunci pemilik>`. | Hantar mesej kepada `@userinfobot` di Telegram untuk melihat id anda. |
| `CF_ANALYTICS_TOKEN` (pilihan) | Agen boleh membaca permintaan setiap pelayan Workers 24 jam lalu. | Cloudflare > My Profile > API Tokens > Create > kebenaran **Account Analytics: Read** sahaja. |

Selepas menambah rahsia: **Actions > "Pusat Kawalan" > Run workflow** (dan "Pelayan Tanya AI Fiqh" selepas `PUSAT_SECRET` supaya worker-fiqh turut menerimanya). Webhook Telegram dipasang sendiri oleh aliran kerja; ia juga boleh dipasang dari papan (butang "Pasang webhook sekarang").

## Berpasangan dengan bot
1. Buka bot anda di Telegram, tekan Start.
2. Hantar `/mula <kunci pemilik>` (kunci Mod Pemilik). Bot menjawab "Berpasangan". Orang lain yang menemui bot hanya mendapat mesej "khas untuk pemilik".
3. Cuba `/stat`, `/sihat`, `/laporan`, atau tulis dalam bahasa biasa, contoh:
   - "Berapa ramai yang sedang melayari sekarang dan halaman apa?"
   - "Berapa token Tanya AI guna minggu ini dan anggaran kosnya?"
   - "Ada PR yang menunggu saya merge?"
   - "Tambah penapis saham Syariah ikut sektor di halaman Pasaran" (agen membuka issue `arahan`; AI Agent harian membinanya melalui PR).

Bot juga menghantar **amaran** apabila mana-mana pelayan rosak dua semakan berturut (dan apabila pulih), serta **laporan harian jam 08:00**. Matikan dengan `/amaran off` atau `/harian off`.

## Privasi pelawat
Laman menghantar denyut setiap 30 saat: id rawak tab (sessionStorage), nama halaman, dan jenis peranti; negara diambil daripada Cloudflare. Tiada kuki, tiada alamat IP disimpan, pelawat dengan "Do Not Track" tidak dikira. Baris sesi dibuang selepas 2 hari; jumlah harian disimpan 90 hari.

## Anggaran kos
Kos ditunjukkan hanya untuk penyedia berbayar (Claude) berdasarkan kadar dalam `worker-pusat/wrangler.toml` (`KOS_CLAUDE_MASUK`, `KOS_CLAUDE_KELUAR`, USD bagi setiap sejuta token; `KADAR_MYR`). Kemas kini angka itu mengikut harga semasa model. Gemini, penghala percuma dan Workers AI dikira RM0 (kuota percuma).
