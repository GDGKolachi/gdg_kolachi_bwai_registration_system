#!/usr/bin/env bash
# =============================================================================
# create-infrastructure.sh
# Provisions all GCP resources needed for the GDG Kolachi BWAI app.
#
# Usage:
#   chmod +x scripts/create-infrastructure.sh
#   ./scripts/create-infrastructure.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - Billing enabled on the project
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURE THESE VALUES
# ---------------------------------------------------------------------------
PROJECT_ID="gdg-registration-492219"          # gcloud projects list
REGION="us-central1"                       # Closest to Pakistan (Mumbai)
ZONE="${REGION}-a"
VM_NAME="gdg-bwai-vm"
MACHINE_TYPE="e2-small"
DISK_SIZE="10GB"
DISK_TYPE="pd-balanced"
GCS_BACKUP_BUCKET="gdg-bwai-postgres-backups"
BACKUP_SA_NAME="gdg-postgres-backup-sa"
BACKUP_SA_EMAIL="${BACKUP_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
# ---------------------------------------------------------------------------

echo "==> Setting active project to ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

# ---- Enable required APIs ----
echo "==> Enabling required GCP APIs..."
gcloud services enable compute.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  --project="${PROJECT_ID}"

# ---- Create the Compute Engine VM ----
echo "==> Creating VM: ${VM_NAME} (${MACHINE_TYPE}, ${DISK_SIZE} ${DISK_TYPE})"
gcloud compute instances create "${VM_NAME}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --machine-type="${MACHINE_TYPE}" \
  --provisioning-model=STANDARD \
  --boot-disk-size="${DISK_SIZE}" \
  --boot-disk-type="${DISK_TYPE}" \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server \
  --metadata=enable-oslogin=TRUE \
  --scopes=https://www.googleapis.com/auth/cloud-platform

echo "==> VM created. External IP:"
gcloud compute instances describe "${VM_NAME}" \
  --zone="${ZONE}" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

# ---- Firewall: allow HTTP/HTTPS ----
echo "==> Creating firewall rules for HTTP/HTTPS..."
gcloud compute firewall-rules create allow-http-https \
  --project="${PROJECT_ID}" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --target-tags=http-server,https-server \
  --description="Allow inbound HTTP and HTTPS" || echo "Firewall rules already exist, skipping."

# ---- GCS bucket for Postgres backups ----
echo "==> Creating GCS backup bucket: gs://${GCS_BACKUP_BUCKET}"
gcloud storage buckets create "gs://${GCS_BACKUP_BUCKET}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --uniform-bucket-level-access || echo "Bucket already exists, skipping."

# Lifecycle: auto-delete objects older than 30 days
cat > /tmp/lifecycle.json <<'EOF'
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }]
  }
}
EOF
gcloud storage buckets update "gs://${GCS_BACKUP_BUCKET}" \
  --lifecycle-file=/tmp/lifecycle.json

# ---- Service account for backup uploads ----
echo "==> Creating backup service account: ${BACKUP_SA_NAME}"
gcloud iam service-accounts create "${BACKUP_SA_NAME}" \
  --project="${PROJECT_ID}" \
  --display-name="GDG Postgres Backup SA" || echo "Service account already exists, skipping."

# Grant Storage Object Creator on the backup bucket
gcloud storage buckets add-iam-policy-binding "gs://${GCS_BACKUP_BUCKET}" \
  --member="serviceAccount:${BACKUP_SA_EMAIL}" \
  --role="roles/storage.objectCreator"

# Also allow listing (needed to delete old objects if done from the SA)
gcloud storage buckets add-iam-policy-binding "gs://${GCS_BACKUP_BUCKET}" \
  --member="serviceAccount:${BACKUP_SA_EMAIL}" \
  --role="roles/storage.objectViewer"

# Download key to deploy/
echo "==> Downloading service account key to deploy/backup-sa-key.json"
gcloud iam service-accounts keys create deploy/backup-sa-key.json \
  --iam-account="${BACKUP_SA_EMAIL}" \
  --project="${PROJECT_ID}"

echo ""
echo "============================================================"
echo "Infrastructure ready!"
echo ""
echo "Next steps:"
echo "  1. Copy deploy/backup-sa-key.json to the VM (done by deploy.sh)"
echo "  2. Run: ./scripts/deploy.sh"
echo "============================================================"
