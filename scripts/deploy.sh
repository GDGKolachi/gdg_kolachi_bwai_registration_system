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
REPO_URL="https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git"
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
gcloud compute scp deploy/.env "${VM_NAME}:${APP_DIR}/.env" \
  --zone="${ZONE}" --project="${PROJECT_ID}"

if [[ -f "deploy/backup-sa-key.json" ]]; then
  echo "==> Copying backup service account key to VM..."
  gcloud compute scp deploy/backup-sa-key.json \
    "${VM_NAME}:${APP_DIR}/backup-sa-key.json" \
    --zone="${ZONE}" --project="${PROJECT_ID}"
fi

# ---- Clone or update repo on VM ----
echo "==> Cloning / updating repo on VM..."
$SSH bash <<REMOTE
  set -euo pipefail

  if [[ ! -d "${APP_DIR}/.git" ]]; then
    echo "  Cloning repo..."
    git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  else
    echo "  Pulling latest changes..."
    cd "${APP_DIR}"
    git fetch origin
    git checkout "${BRANCH}"
    git reset --hard "origin/${BRANCH}"
  fi

  # Move .env into place (scp put it there already)
  cp -f "${APP_DIR}/.env" "${APP_DIR}/.env"
REMOTE

# ---- Build and start containers ----
echo "==> Building Docker images and starting containers..."
$SSH bash <<REMOTE
  set -euo pipefail
  cd "${APP_DIR}"

  # Copy .env to root (docker-compose reads from project root)
  cp -f .env .env

  docker compose pull postgres 2>/dev/null || true
  docker compose up --build -d --remove-orphans

  echo "  Waiting for containers to be healthy..."
  sleep 10
  docker compose ps
REMOTE

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
