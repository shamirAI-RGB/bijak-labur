# Activepieces untuk Hugging Face Space (Docker, CPU basic percuma).
# Hugging Face menjalankan bekas sebagai UID 1000 dan membuka port 7860, jadi folder app diberi kepada UID 1000.
# Semua rahsia (pangkalan data, kunci penyulitan) dimasukkan dalam Settings > Variables and secrets di Space.
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
