# Panduan: Activepieces peribadi di agen.bijaklabur.my

Hasil akhir: anda buka **https://agen.bijaklabur.my**, masukkan kod yang dihantar ke e-mel anda, kemudian log masuk Activepieces. Orang lain tidak boleh masuk walaupun tahu alamatnya.

Semua percuma. Anda perlu tiga akaun: **Neon** (pangkalan data, sudah ada), **Hugging Face** (pelayan Activepieces) dan **Cloudflare** (sudah ada).

```
Anda --> agen.bijaklabur.my --> Cloudflare Access (kod e-mel, hanya e-mel anda)
                               --> Worker bijak-labur-agen (semak token sekali lagi)
                               --> Hugging Face Space PERIBADI (Activepieces) --> Neon Postgres (flow & rekod run)
```

Activepieces ialah pelayan Node dengan pangkalan data, jadi ia tidak boleh berjalan di GitHub Pages atau Cloudflare Worker. Hugging Face memberi pelayan percuma 2 CPU dan 16 GB RAM tanpa kad kredit. Neon menyimpan data secara kekal.

---

## Langkah 1: Nilai sambungan Neon (3 minit)

1. Buka projek Neon anda di https://console.neon.tech dan tekan **Connect**.
2. Branch: **production**. Matikan **Connection pooling** (host **tidak** mengandungi `-pooler`). Pilih paparan **Parameters only**.
3. Catat `PGHOST`, `PGDATABASE`, `PGUSER` dan `PGPASSWORD`. Jangan hantar kata laluan dalam chat.

## Langkah 2: Space Hugging Face peribadi (10 minit)

1. Daftar di https://huggingface.co/join (percuma) dan sahkan e-mel.
2. Buka https://huggingface.co/new-space:
   - Space name: `bijaklabur-agen`
   - Space SDK: **Docker**, templat **Blank**
   - Space hardware: **CPU basic · 2 vCPU · 16 GB · FREE**
   - Visibility: **Private** (wajib)
   - Tekan **Create Space**.
3. Tab **Files** > **+ Add file** > **Create a new file**. Nama fail `Dockerfile`, salin kandungan ini, kemudian **Commit new file to main**:
   ```
   FROM activepieces/activepieces:0.92.1

   USER root
   RUN mkdir -p /home/ap/.activepieces /home/ap/cache && chown -R 1000:1000 /usr/src/app /home/ap
   USER 1000

   ENV HOME=/home/ap \
       AP_CONFIG_PATH=/home/ap/.activepieces \
       AP_CACHE_BASE_PATH=/home/ap/cache \
       AP_PORT=7860 \
       AP_CONTAINER_TYPE=WORKER_AND_APP \
       AP_DB_TYPE=POSTGRES \
       AP_POSTGRES_PORT=5432 \
       AP_POSTGRES_USE_SSL=true \
       AP_REDIS_TYPE=MEMORY \
       AP_EXECUTION_MODE=UNSANDBOXED \
       AP_TELEMETRY_ENABLED=false \
       AP_FRONTEND_URL=https://agen.bijaklabur.my

   EXPOSE 7860
   ```
   (Fail yang sama ada dalam repo: `activepieces/Dockerfile`.)
4. Tab **Settings** > **Variables and secrets** > **New secret** untuk setiap baris:

   | Name | Value |
   |---|---|
   | `AP_POSTGRES_HOST` | PGHOST |
   | `AP_POSTGRES_DATABASE` | PGDATABASE |
   | `AP_POSTGRES_USERNAME` | PGUSER |
   | `AP_POSTGRES_PASSWORD` | PGPASSWORD |
   | `AP_ENCRYPTION_KEY` | jana dengan `openssl rand -hex 16` (32 aksara) |
   | `AP_JWT_SECRET` | jana dengan `openssl rand -hex 32` |

   Jangan tukar `AP_ENCRYPTION_KEY` selepas ini, kerana sambungan (kunci API, akaun Google dan lain-lain) yang anda simpan dalam Activepieces dikunci dengannya.
5. Space membina sendiri. Tunggu status di atas menjadi **Running** (beberapa minit). Jika ia menjadi *Runtime error*, tekan **Logs** dan hantar tangkapan skrin kepada saya.
6. Cari alamat terus Space: menu **⋮** di kanan atas > **Embed this Space** > **Direct URL**. Bentuknya `https://NAMAANDA-bijaklabur-agen.hf.space`. Catat alamat ini.

## Langkah 3: Token Hugging Face untuk pintu (2 minit)

1. Buka https://huggingface.co/settings/tokens > **Create new token**.
2. Token type: **Read**. Nama: `bijaklabur-agen`. Tekan **Create token**.
3. Salin token (bermula dengan `hf_`). Ia hanya dipaparkan sekali.

## Langkah 4: Cloudflare Access, kunci e-mel (10 minit)

1. Log masuk https://dash.cloudflare.com > menu kiri **Zero Trust**.
2. Kali pertama sahaja: pilih **team name**, contohnya `bijaklabur` (alamat pasukan menjadi `bijaklabur.cloudflareaccess.com`), kemudian pelan **Free**. Jika Cloudflare meminta kad, pelan Free tidak dicaj.
3. **Access** (atau **Access controls**) > **Applications** > **Add an application** > **Self-hosted**:
   - Application name: `Agen AI`
   - Session duration: `24 hours`
   - Public hostname: subdomain `agen`, domain `bijaklabur.my`, path kosong.
4. Policy: nama `Hanya pemilik`, Action **Allow**, Include > **Emails** > e-mel anda sahaja.
5. Login methods: pastikan **One-time PIN** ditanda. Simpan.
6. Buka semula aplikasi `Agen AI` > **Overview**. Salin **Application Audience (AUD) Tag**.
7. *(Pilihan, hanya jika flow anda dicetuskan oleh webhook daripada perkhidmatan luar)*: tambah aplikasi kedua **Self-hosted**, nama `Agen webhook`, hostname `agen` . `bijaklabur.my`, path `api/v1/webhooks`, policy Action **Bypass**, Include **Everyone**. Pintu Worker sudah membenarkan laluan ini sahaja tanpa log masuk.

## Langkah 5: Rahsia GitHub (5 minit)

Buka https://github.com/shamirAI-RGB/bijak-labur/settings/secrets/actions > **New repository secret** untuk setiap baris:

| Name | Value |
|---|---|
| `AGEN_SPACE_URL` | alamat terus daripada Langkah 2.6 |
| `AGEN_HF_TOKEN` | token `hf_...` daripada Langkah 3 |
| `ACCESS_TEAM` | team name daripada Langkah 4.2, contoh `bijaklabur` |
| `ACCESS_AUD` | AUD Tag daripada Langkah 4.6 |
| `ACCESS_EMAIL` | e-mel anda (sama dengan policy Access) |

Kemudian **Actions** > **Pintu AI Agent (agen.bijaklabur.my)** > **Run workflow**.

## Langkah 6: Buka dan cipta akaun

1. Buka https://agen.bijaklabur.my. Masukkan e-mel anda, kemudian kod yang dihantar.
2. Activepieces memaparkan halaman **Sign up**. Cipta akaun pertama (anda menjadi pemilik platform) dengan kata laluan yang kuat.
3. Pautan **Pantau AI Agent (Activepieces)** juga ada dalam panel **Mod Pemilik** di laman. Ia tidak dipaparkan kepada pelawat biasa.

---

## Perkara yang perlu diketahui

- **Melihat kemajuan agen**: menu **Runs** menunjukkan setiap perjalanan flow dan agen, langkah demi langkah (input, output, ralat, tempoh). **Flows** untuk membina; **Agents** untuk agen AI.
- **Space kekal berjaga**: pintu Worker mengetuk Space setiap 6 jam, supaya flow berjadual tidak berhenti. Jika Space tetap tidur, halaman "Agen sedang dihidupkan" dipaparkan; tunggu satu hingga tiga minit.
- **Data kekal** dalam Neon (flow, rekod run, akaun, sambungan yang disulitkan). Neon percuma memberi 0.5 GB.
- **Giliran kerja dalam memori**: jika Space dimulakan semula ketika flow sedang berjalan, run itu mungkin terhenti; jalankan semula dari **Runs**.
- **Webhook**: alamat webhook ialah `https://agen.bijaklabur.my/api/v1/webhooks/...` (perlu Langkah 4.7). Pengirim webhook tidak boleh menggunakan pengepala `Authorization` kerana ia diganti oleh pintu; gunakan pengepala lain atau parameter dalam alamat.
- **Kunci model AI** (contoh Gemini percuma) dimasukkan dalam Activepieces > **Connections**, bukan dalam repo.
- "Akses ditolak" walaupun kod e-mel betul: semak `ACCESS_EMAIL`, `ACCESS_TEAM` dan `ACCESS_AUD` sama dengan Cloudflare, kemudian jalankan semula aliran kerja.
- "Agen belum disediakan": salah satu daripada lima rahsia GitHub belum ditetapkan.
