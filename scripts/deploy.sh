#!/usr/bin/env bash
# =============================================================================
# deploy.sh
# Deploys the app to the GCP Compute Engine VM via SSH.
# Run from your local machine after creating infrastructure.
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURE THESE (must match create-infrastructure.sh)
# ---------------------------------------------------------------------------
PROJECT_ID="gdg-registration-492219"
ZONE="us-central1-a"
VM_NAME="gdg-bwai-vm"
APP_DIR="/opt/gdg-bwai"
REPO_URL="https://x-access-token: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@github.com/techymualim/gdg_kolachi_bwai_registration_system.git"
BRANCH="main"
# ---------------------------------------------------------------------------

SSH="gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --"

echo "==> Getting VM external IP..."
VM_IP=$(gcloud compute instances describe "${VM_NAME}" \
  --zone="${ZONE}" \
  --project="${PROJECT_ID}" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
echo "    VM IP: ${VM_IP}"

# ---- Copy .env and backup SA key to the VM ----
echo "==> Copying .env to VM (expects deploy/.env to exist locally)..."
if [[ ! -f "deploy/.env" ]]; then
  echo "ERROR: deploy/.env not found. Copy deploy/.env.example → deploy/.env and fill in values."
  exit 1
fi
gcloud compute scp deploy/.env "${VM_NAME}:/tmp/gdg-bwai.env" \
  --zone="${ZONE}" --project="${PROJECT_ID}"
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" \
  --command="sudo cp /tmp/gdg-bwai.env ${APP_DIR}/.env && sudo chmod 600 ${APP_DIR}/.env"

if [[ -f "deploy/backup-sa-key.json" ]]; then
  echo "==> Copying backup service account key to VM..."
  gcloud compute scp deploy/backup-sa-key.json \
    "${VM_NAME}:/tmp/backup-sa-key.json" \
    --zone="${ZONE}" --project="${PROJECT_ID}"
  gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" \
    --command="sudo cp /tmp/backup-sa-key.json ${APP_DIR}/backup-sa-key.json && sudo chmod 600 ${APP_DIR}/backup-sa-key.json"
fi

# ---- Clone or update repo on VM ----
echo "==> Cloning / updating repo on VM..."
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --command="
  set -euo pipefail

  sudo git config --global --add safe.directory '${APP_DIR}'

  cd '${APP_DIR}'

  if [ ! -d '${APP_DIR}/.git' ]; then
    echo '  Initializing repo...'
    sudo git init
  fi

  # Ensure remote is set correctly
  if sudo git remote get-url origin >/dev/null 2>&1; then
    sudo git remote set-url origin '${REPO_URL}'
  else
    sudo git remote add origin '${REPO_URL}'
  fi

  echo '  Fetching and checking out ${BRANCH}...'
  sudo git fetch origin
  sudo git checkout -f '${BRANCH}' 2>/dev/null || sudo git checkout -b '${BRANCH}' 'origin/${BRANCH}'
  sudo git reset --hard 'origin/${BRANCH}'
"

# ---- Build and start containers ----
echo "==> Building Docker images and starting containers..."
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --command="
  set -euo pipefail
  cd '${APP_DIR}'

  sudo docker compose pull postgres 2>/dev/null || true
  sudo docker compose up --build -d --remove-orphans

  echo '  Waiting for containers to be healthy...'
  sleep 10
  sudo docker compose ps
"

echo ""
echo "============================================================"
echo "Deployment complete!"
echo "  App:   http://${VM_IP}"
echo "  API:   http://${VM_IP}/api/docs  (Swagger)"
echo ""
echo "To install the daily Postgres backup cron, SSH in and run:"
echo "  gcloud compute ssh ${VM_NAME} --zone=${ZONE}"
echo "  bash ${APP_DIR}/deploy/install-backup-cron.sh"
echo "============================================================"
