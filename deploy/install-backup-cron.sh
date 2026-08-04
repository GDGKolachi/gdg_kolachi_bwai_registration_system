#!/usr/bin/env bash
# =============================================================================
# install-backup-cron.sh
# Installs the nightly Postgres backup cron job on the VM.
#
# Usage (while SSH'd into the VM):
#   bash /opt/gdg-bwai/deploy/install-backup-cron.sh
#
# There is nothing to configure. postgres-backup.sh reads DB credentials from
# /opt/gdg-bwai/.env and uploads with the VM's attached service account, so no
# secrets are written anywhere the deploy can delete them. The previous version
# of this script prompted for credentials and wrote /opt/gdg-bwai/.backup.env
# plus a service-account key — both of which the next deploy wiped, silently
# breaking every backup from then on.
#
# The job runs as root because /opt/gdg-bwai/.env is chmod 600 and root-owned.
# =============================================================================
set -euo pipefail

BACKUP_SCRIPT="/opt/gdg-bwai/deploy/postgres-backup.sh"
LOG_FILE="/var/log/gdg-backup.log"

sudo chmod +x "${BACKUP_SCRIPT}"
sudo touch "${LOG_FILE}"

# Daily at 02:00 server time, in root's crontab.
#
# `|| true` is load-bearing: grep exits 1 when it filters out every line, which
# is exactly what happens on a re-run where the backup job is the only entry.
# Under `set -o pipefail` that aborted this script mid-pipeline and left root
# with an empty crontab — the backup silently stopped being scheduled at all.
CRON_JOB="0 2 * * * /bin/bash ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1"
EXISTING=$(sudo crontab -l 2>/dev/null | grep -v "postgres-backup.sh" || true)
printf '%s\n%s\n' "${EXISTING}" "${CRON_JOB}" | sed '/^$/d' | sudo crontab -

echo "Cron entries now:"
sudo crontab -l | sed 's/^/  /'

# Keep the log from becoming another unbounded file on a small disk.
sudo tee /etc/logrotate.d/gdg-backup > /dev/null <<'EOF'
/var/log/gdg-backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}
EOF

echo ""
echo "============================================================"
echo "Cron installed: daily backup at 02:00 server time"
echo "Logs:    ${LOG_FILE} (rotated weekly, 4 kept)"
echo "Bucket:  gs://gdg-bwai-postgres-backups/daily/ (30-day lifecycle)"
echo ""
echo "Run it now to confirm it works end to end:"
echo "  sudo bash ${BACKUP_SCRIPT}"
echo ""
echo "Then check the object actually landed:"
echo "  gcloud storage ls -l gs://gdg-bwai-postgres-backups/daily/ | tail -3"
echo "============================================================"
