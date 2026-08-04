#!/usr/bin/env bash
# =============================================================================
# vm-setup.sh  —  Run ONCE on a fresh Ubuntu 24.04 VM to install Docker,
# Docker Compose, and the Google Cloud SDK needed for GCS backups.
#
# Usage (from your local machine):
#   gcloud compute ssh gdg-bwai-vm --zone=asia-south1-a -- 'bash -s' < deploy/vm-setup.sh
# =============================================================================
set -euo pipefail

echo "==> Updating apt packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ---- Docker ----
echo "==> Installing Docker..."
sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker

# Allow current user to run Docker without sudo
sudo usermod -aG docker "$USER"

# ---- Google Cloud SDK (for gsutil in backup script) ----
echo "==> Installing Google Cloud SDK..."
sudo apt-get install -y -qq apt-transport-https
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/cloud.google.gpg

echo "deb [signed-by=/etc/apt/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
  | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y -qq google-cloud-cli

# ---- Git ----
echo "==> Installing git..."
sudo apt-get install -y -qq git

# ---- Journal size cap ----
# The default journal is unbounded. On this VM it reached 788M — most of a disk
# that only has 8.7G — and helped push a deploy into ENOSPC.
echo "==> Capping systemd journal at 200M..."
if grep -qE '^\s*#?\s*SystemMaxUse=' /etc/systemd/journald.conf; then
  sudo sed -i 's/^\s*#\?\s*SystemMaxUse=.*/SystemMaxUse=200M/' /etc/systemd/journald.conf
else
  echo 'SystemMaxUse=200M' | sudo tee -a /etc/systemd/journald.conf > /dev/null
fi
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=200M

# ---- App directory ----
echo "==> Creating /opt/gdg-bwai app directory..."
sudo mkdir -p /opt/gdg-bwai
sudo chown "$USER":"$USER" /opt/gdg-bwai

echo ""
echo "============================================================"
echo "VM setup complete!"
echo "Log out and back in (or run 'newgrp docker') so Docker group takes effect."
echo "Then run the deploy script."
echo "============================================================"
