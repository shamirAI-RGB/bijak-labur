# Flowise untuk Hugging Face Space (Docker, CPU basic percuma).
# Imej rasmi berjalan sebagai pengguna "node" (UID 1000), sama seperti yang dikehendaki oleh Hugging Face.
# Semua tetapan dan rahsia dimasukkan dalam Settings > Variables and secrets di Space, bukan di sini.
FROM flowiseai/flowise:3.1.4

ENV PORT=7860 \
    DISABLE_FLOWISE_TELEMETRY=true \
    LOG_PATH=/home/node/.flowise/logs \
    BLOB_STORAGE_PATH=/home/node/.flowise/storage \
    SECRETKEY_PATH=/home/node/.flowise

EXPOSE 7860
