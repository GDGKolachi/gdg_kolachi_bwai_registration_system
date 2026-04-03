#!/usr/bin/env bash
# =============================================================================
# install-backup-cron.sh
# Installs the Postgres backup script and a daily cron job on the VM.
# Run this once after deploying, while SSH'd into the VM.
#
# Usage:
#   bash /opt/gdg-bwai/deploy/install-backup-cron.sh
# =============================================================================
set -euo pipefail

BACKUP_SCRIPT="/opt/gdg-bwai/deploy/postgres-backup.sh"
BACKUP_ENV="/opt/gdg-bwai/.backup.env"
LOG_FILE="/var/log/gdg-postgres-backup.log"

# ---- Ensure backup script is executable ----
chmod +x "${BACKUP_SCRIPT}"

# ---- Create log file ----
sudo touch "${LOG_FILE}"
sudo chown "$USER":"$USER" "${LOG_FILE}"

# ---- Prompt for backup environment values ----
echo ""
echo "==> Configuring backup environment (saved to ${BACKUP_ENV})"
read -r -p "DB_USER [postgres]: " input_db_user
DB_USER="${input_db_user:-postgres}"

read -r -s -p "DB_PASSWORD: " input_db_password
echo ""
DB_PASSWORD="${input_db_password}"

read -r -p "DB_NAME [gdg_bwai]: " input_db_name
DB_NAME="${input_db_name:-gdg_bwai}"

read -r -p "GCS_BUCKET (e.g. gdg-bwai-postgres-backups): " GCS_BUCKET

SA_KEY_PATH="/opt/gdg-bwai/backup-sa-key.json"

cat > "${BACKUP_ENV}" <<EOF
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
GCS_BUCKET=${GCS_BUCKET}
GOOGLE_APPLICATION_CREDENTIALS=${SA_KEY_PATH}
EOF
chmod 600 "${BACKUP_ENV}"
echo "Backup env saved."

# ---- Install cron job: daily at 02:00 AM ----
CRON_JOB="0 2 * * * ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1"

# Avoid duplicates
( crontab -l 2>/dev/null | grep -v "${BACKUP_SCRIPT}" ; echo "${CRON_JOB}" ) | crontab -

echo ""
echo "============================================================"
echo "Cron job installed: daily backup at 02:00 AM server time"
echo "Logs: ${LOG_FILE}"
echo ""
echo "Test it manually:"
echo "  bash ${BACKUP_SCRIPT}"
echo "============================================================"
