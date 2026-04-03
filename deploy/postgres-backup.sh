#!/usr/bin/env bash
# =============================================================================
# postgres-backup.sh
# Dumps the Postgres database running in Docker, compresses it, and uploads
# to Google Cloud Storage.  Installed as a cron job by install-backup-cron.sh.
#
# Environment variables (set in /opt/gdg-bwai/.backup.env):
#   DB_USER          Postgres username
#   DB_PASSWORD      Postgres password
#   DB_NAME          Database name
#   GCS_BUCKET       GCS bucket name (e.g. gdg-bwai-postgres-backups)
#   GOOGLE_APPLICATION_CREDENTIALS  Path to backup SA key JSON
# =============================================================================
set -euo pipefail

# Load backup environment
ENV_FILE="/opt/gdg-bwai/.backup.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

: "${DB_USER:?DB_USER is not set}"
: "${DB_PASSWORD:?DB_PASSWORD is not set}"
: "${DB_NAME:?DB_NAME is not set}"
: "${GCS_BUCKET:?GCS_BUCKET is not set}"
: "${GOOGLE_APPLICATION_CREDENTIALS:?GOOGLE_APPLICATION_CREDENTIALS is not set}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/gdg_bwai_${TIMESTAMP}.sql.gz"
GCS_PATH="gs://${GCS_BUCKET}/daily/${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting Postgres backup → ${GCS_PATH}"

# Run pg_dump inside the running postgres container and compress on the fly
docker exec gdg_postgres \
  env PGPASSWORD="${DB_PASSWORD}" \
  pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "${BACKUP_FILE}"

# Activate the service account
gcloud auth activate-service-account \
  --key-file="${GOOGLE_APPLICATION_CREDENTIALS}" \
  --quiet

# Upload to GCS
gcloud storage cp "${BACKUP_FILE}" "${GCS_PATH}" --quiet

# Remove local temp file
rm -f "${BACKUP_FILE}"

echo "[$(date)] Backup complete: ${GCS_PATH}"
