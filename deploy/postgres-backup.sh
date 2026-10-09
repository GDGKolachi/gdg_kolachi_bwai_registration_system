#!/usr/bin/env bash
# =============================================================================
# postgres-backup.sh
# Dumps the Postgres database running in Docker, compresses it, and uploads
# to Google Cloud Storage. Installed as a cron job by install-backup-cron.sh.
#
# Credentials come from the app's own /opt/gdg-bwai/.env (DB_USER, DB_PASSWORD,
# DB_NAME) and the upload uses the VM's attached service account.
#
# Both of those are deliberate. This script used to read a separate
# /opt/gdg-bwai/.backup.env and authenticate with a service-account key at
# /opt/gdg-bwai/backup-sa-key.json — but the deploy wipes /opt/gdg-bwai of
# everything except .env on every release:
#
#     sudo find . -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +
#
# so both files were destroyed by the first deploy after setup, and every
# nightly run since died at "DB_USER is not set" before reaching pg_dump. The
# bucket sat empty while cron reported success to no one. Reading .env (which
# survives) and using the VM's ambient credentials (no file at all) leaves
# nothing for a deploy to delete.
#
# Optional overrides, if /opt/gdg-bwai/.backup.env exists it is sourced last:
#   GCS_BUCKET       defaults to gdg-bwai-postgres-backups
#   CONTAINER        defaults to gdg_postgres
# =============================================================================
set -euo pipefail

APP_ENV="${APP_ENV:-/opt/gdg-bwai/.env}"
OVERRIDE_ENV="${OVERRIDE_ENV:-/opt/gdg-bwai/.backup.env}"

if [[ ! -r "$APP_ENV" ]]; then
  echo "[$(date)] FATAL: cannot read ${APP_ENV} — run this as root (cron does)." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$APP_ENV"
[[ -f "$OVERRIDE_ENV" ]] && source "$OVERRIDE_ENV"
set +a

GCS_BUCKET="${GCS_BUCKET:-gdg-bwai-postgres-backups}"
CONTAINER="${CONTAINER:-gdg_postgres}"

: "${DB_USER:?DB_USER is not set in ${APP_ENV}}"
: "${DB_PASSWORD:?DB_PASSWORD is not set in ${APP_ENV}}"
: "${DB_NAME:?DB_NAME is not set in ${APP_ENV}}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/gdg_bwai_${TIMESTAMP}.sql.gz"
GCS_PATH="gs://${GCS_BUCKET}/daily/${TIMESTAMP}.sql.gz"

# A partial dump that still uploads is worse than no dump, because it looks
# like a backup until the day you restore it.
cleanup() { rm -f "$BACKUP_FILE"; }
trap cleanup EXIT

echo "[$(date)] Starting Postgres backup → ${GCS_PATH}"

# PIPESTATUS is checked so a pg_dump failure is not masked by gzip succeeding
# on the truncated stream it received.
set +e
docker exec "$CONTAINER" \
  env PGPASSWORD="${DB_PASSWORD}" \
  pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "${BACKUP_FILE}"
STATUS=("${PIPESTATUS[@]}")
set -e
if [[ "${STATUS[0]}" -ne 0 || "${STATUS[1]}" -ne 0 ]]; then
  echo "[$(date)] FATAL: dump failed (pg_dump=${STATUS[0]} gzip=${STATUS[1]}) — nothing uploaded." >&2
  exit 1
fi

if ! gzip -t "${BACKUP_FILE}"; then
  echo "[$(date)] FATAL: ${BACKUP_FILE} is not a valid gzip — nothing uploaded." >&2
  exit 1
fi

SIZE=$(stat -c%s "${BACKUP_FILE}")
if [[ "$SIZE" -lt 10000 ]]; then
  echo "[$(date)] FATAL: dump is only ${SIZE} bytes — refusing to upload a likely-empty backup." >&2
  exit 1
fi

# Uses the VM's attached service account; no key file to place or lose.
gcloud storage cp "${BACKUP_FILE}" "${GCS_PATH}" --quiet

echo "[$(date)] Backup complete: ${GCS_PATH} (${SIZE} bytes)"
