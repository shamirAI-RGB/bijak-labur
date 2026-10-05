# Panduan: Flowise peribadi di agen.bijaklabur.my

Hasil akhir: anda buka **https://agen.bijaklabur.my**, masukkan kod yang dihantar ke e-mel anda, kemudian log masuk Flowise. Orang lain tidak boleh masuk walaupun tahu alamatnya.

Semua percuma. Anda perlu tiga akaun: **Neon** (pangkalan data), **Hugging Face** (pelayan Flowise) dan **Cloudflare** (yang anda sudah ada).

```
Anda --> agen.bijaklabur.my --> Cloudflare Access (kod e-mel, hanya e-mel anda)
                               --> Worker bijak-labur-agen (semak token sekali lagi)
                               --> Hugging Face Space PERIBADI (Flowise) --> Neon Postgres (simpan flow & rekod)
```

Mengapa begini: Flowise ialah pelayan Node dengan pangkalan data, jadi ia tidak boleh berjalan di GitHub Pages atau Cloudflare Worker. Hugging Face memberi pelayan percuma 2 CPU dan 16 GB RAM tanpa kad kredit, dan Neon menyimpan data secara kekal supaya tiada yang hilang apabila Space dimulakan semula.

---

## Langkah 1: Pangkalan data Neon (5 minit)

1. Buka https://neon.tech dan **Sign up** dengan akaun Google anda.
2. **Create project**:
   - Project name: `flowise`
   - Postgres version: biarkan lalai
   - Region: **AWS Asia Pacific (Singapore)**
3. Selepas projek dicipta, tekan **Connect**. Tukar paparan kepada **Parameters only** (bukan connection string). Catat empat nilai ini:
   - `PGHOST` (contoh `ep-xxxx-pooler.ap-southeast-1.aws.neon.tech`)
   - `PGDATABASE` (biasanya `neondb`)
   - `PGUSER` (biasanya `neondb_owner`)
   - `PGPASSWORD`
   - Matikan pilihan **Connection pooling** jika ada, supaya host **tidak** mengandungi `-pooler`.

## Langkah 2: Space Hugging Face peribadi (10 minit)

1. Buka https://huggingface.co/join dan daftar (percuma). Sahkan e-mel.
2. Buka https://huggingface.co/new-space:
   - Space name: `bijaklabur-agen`
   - License: biarkan kosong
   - Space SDK: **Docker**, templat **Blank**
   - Space hardware: **CPU basic · 2 vCPU · 16 GB · FREE**
   - Visibility: **Private** (wajib)
   - Tekan **Create Space**.
3. Dalam Space, buka tab **Files** > **+ Add file** > **Create a new file**:
   - Nama fail: `Dockerfile`
   - Salin kandungan `flowise/Dockerfile` daripada repo bijak-labur (sudah ada dalam PR), atau salin ini:
     ```
     FROM flowiseai/flowise:3.1.4

     ENV PORT=7860 \
         DISABLE_FLOWISE_TELEMETRY=true \
         LOG_PATH=/home/node/.flowise/logs \
         BLOB_STORAGE_PATH=/home/node/.flowise/storage \
         SECRETKEY_PATH=/home/node/.flowise

     EXPOSE 7860
     ```
   - Tekan **Commit new file to main**.
4. Buka tab **Settings** > bahagian **Variables and secrets**.
   - Tekan **New variable** untuk setiap baris ini (nilai tidak rahsia):

     | Name | Value |
     |---|---|
     | `DATABASE_TYPE` | `postgres` |
     | `DATABASE_PORT` | `5432` |
     | `DATABASE_SSL` | `true` |
     | `APP_URL` | `https://agen.bijaklabur.my` |

   - Tekan **New secret** untuk setiap baris ini:

     | Name | Value |
     |---|---|
     | `DATABASE_HOST` | PGHOST daripada Neon |
     | `DATABASE_NAME` | PGDATABASE |
     | `DATABASE_USER` | PGUSER |
     | `DATABASE_PASSWORD` | PGPASSWORD |
     | `FLOWISE_SECRETKEY_OVERWRITE` | daripada fail `kunci-flowise-RAHSIA/rahsia-space.txt` |
     | `JWT_AUTH_TOKEN_SECRET` | daripada fail yang sama |
     | `JWT_REFRESH_TOKEN_SECRET` | daripada fail yang sama |
     | `EXPRESS_SESSION_SECRET` | daripada fail yang sama |
     | `TOKEN_HASH_SECRET` | daripada fail yang sama |

   Jana setiap nilai rawak dengan `openssl rand -hex 32` (atau gunakan fail `rahsia-space.txt` dalam fail projek). Jangan tukar `FLOWISE_SECRETKEY_OVERWRITE` selepas ini, kerana kunci API yang anda simpan dalam Flowise dikunci dengannya.
5. Tekan **Factory rebuild** (dalam Settings) atau tunggu Space membina sendiri. Status di atas bertukar daripada *Building* kepada **Running** dalam beberapa minit.
6. **Segera** buka tab **App** dalam Space. Flowise meminta anda mencipta akaun pentadbir pertama: masukkan nama, e-mel anda dan kata laluan yang kuat. Akaun ini ialah log masuk Flowise anda. (Space peribadi, jadi hanya anda boleh melihat halaman ini.)
7. Cari alamat terus Space: menu **⋮** di kanan atas > **Embed this Space** > **Direct URL**. Bentuknya `https://NAMAANDA-bijaklabur-agen.hf.space`. Catat alamat ini.

## Langkah 3: Token Hugging Face untuk pintu (2 minit)

1. Buka https://huggingface.co/settings/tokens > **Create new token**.
2. Token type: **Read**. Nama: `bijaklabur-agen`. Tekan **Create token**.
3. Salin token (bermula dengan `hf_`). Ia hanya dipaparkan sekali.

## Langkah 4: Cloudflare Access, kunci e-mel (10 minit)

1. Log masuk https://dash.cloudflare.com > menu kiri **Zero Trust**.
2. Kali pertama sahaja:
   - Pilih **team name**, contohnya `bijaklabur`. Alamat pasukan anda akan menjadi `bijaklabur.cloudflareaccess.com`.
   - Pilih pelan **Free** ($0, hingga 50 pengguna). Jika Cloudflare meminta kad, pelan Free tidak dicaj.
3. Pergi ke **Access** (atau **Access controls**) > **Applications** > **Add an application** > **Self-hosted**.
   - Application name: `Agen Flowise`
   - Session duration: `24 hours`
   - Public hostname: subdomain `agen`, domain `bijaklabur.my`, path kosong.
4. Tambah **policy**:
   - Policy name: `Hanya pemilik`
   - Action: **Allow**
   - Include > Selector **Emails** > masukkan e-mel anda sahaja.
5. Login methods: pastikan **One-time PIN** ditanda. Simpan aplikasi.
6. Buka semula aplikasi `Agen Flowise` > tab **Overview** (atau **Basic information**). Salin **Application Audience (AUD) Tag** (rentetan panjang huruf dan nombor).

## Langkah 5: Rahsia GitHub (5 minit)

Buka https://github.com/shamirAI-RGB/bijak-labur/settings/secrets/actions > **New repository secret** untuk setiap baris:

| Name | Value |
|---|---|
| `FLOWISE_SPACE_URL` | alamat terus daripada Langkah 2.7, contoh `https://namaanda-bijaklabur-agen.hf.space` |
| `FLOWISE_HF_TOKEN` | token `hf_...` daripada Langkah 3 |
| `ACCESS_TEAM` | team name daripada Langkah 4.2, contoh `bijaklabur` |
| `ACCESS_AUD` | AUD Tag daripada Langkah 4.6 |
| `ACCESS_EMAIL` | e-mel anda (sama dengan policy Access) |

`CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` sudah ada daripada pelayan jadual, jadi tidak perlu ditambah.

## Langkah 6: Hidupkan pintu

1. Merge PR Flowise dalam repo bijak-labur.
2. Jika rahsia ditambah selepas merge: **Actions** > **Pintu Flowise (agen.bijaklabur.my)** > **Run workflow**.
3. Buka https://agen.bijaklabur.my:
   - Cloudflare meminta e-mel. Masukkan e-mel anda, kemudian kod yang dihantar.
   - Log masuk Flowise dengan akaun pentadbir daripada Langkah 2.6.
4. Pautan **Pantau AI Agent (Flowise)** juga ada dalam panel **Mod Pemilik** di laman (menu tiga titik > Mod Pemilik). Ia tidak dipaparkan kepada pelawat biasa.

---

## Perkara yang perlu diketahui

- **Space tidur** selepas 48 jam tanpa pelawat. Apabila anda buka semula, halaman "Agen sedang dihidupkan" dipaparkan dan dimuat semula sendiri; tunggu satu hingga tiga minit.
- **Data kekal** dalam Neon (flow, rekod perjalanan agen, akaun, kunci API yang disulitkan). Neon percuma memberi 0.5 GB, cukup untuk ribuan rekod.
- **Fail yang dimuat naik** ke Flowise (contoh PDF untuk Document Store) disimpan dalam Space dan hilang apabila Space dimulakan semula. Simpan salinan asal; muat naik semula jika perlu.
- **Melihat kemajuan agen**: dalam Flowise, buka **Agentflows** untuk membina agen, dan **Executions** untuk melihat setiap langkah yang dijalankan oleh agen (input, output, alat yang dipanggil, ralat).
- **Kunci model AI** (contoh Gemini percuma) dimasukkan dalam Flowise > **Credentials**, bukan dalam repo.
- Jika "Akses ditolak" walaupun kod e-mel betul: semak `ACCESS_EMAIL`, `ACCESS_TEAM` dan `ACCESS_AUD` dalam GitHub sama dengan Cloudflare, kemudian jalankan semula aliran kerja.
- Jika "Agen belum disediakan": salah satu daripada lima rahsia GitHub belum ditetapkan.
