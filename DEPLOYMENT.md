# GDG Kolachi BWAI — GCP Deployment Guide

## Architecture Overview

```
Compute Engine VM (e2-small)
├── postgres:16-alpine        (internal, port 5432)
├── gdg_backend (NestJS)      (internal, port 3000)
└── gdg_frontend (nginx)      (public, port 80)
      ├── serves React SPA static files
      └── proxies /api/* → backend:3000

Google Cloud Storage
└── gdg-bwai-postgres-backups/
      └── daily/YYYYMMDD_HHMMSS.sql.gz   (auto-deleted after 30 days)
```

## VM Specs

| Property | Value |
|---|---|
| Machine type | e2-small (2 vCPU, 2 GB RAM) |
| Boot disk | 10 GB balanced persistent disk |
| OS | Ubuntu 24.04 LTS |
| Provisioning model | Standard |
| Region | us-central1 |
| Zone | us-central1-a |

---

## Files Created

```
backend/Dockerfile                    ← multi-stage Node build
frontend/Dockerfile                   ← multi-stage Vite build → nginx
frontend/nginx.conf                   ← serves SPA + proxies /api to backend
docker-compose.yml                    ← orchestrates postgres + backend + frontend
deploy/
  vm-setup.sh                         ← run once on fresh VM (Docker, gcloud SDK)
  postgres-backup.sh                  ← pg_dump → gzip → upload to GCS
  install-backup-cron.sh              ← installs daily 2 AM cron job
  .env.example                        ← template for production secrets
scripts/
  create-infrastructure.sh            ← provisions VM, firewall, GCS bucket, SA key
  deploy.sh                           ← local deploy via gcloud SSH/SCP
.github/workflows/deploy.yml          ← CI/CD: push to main → auto-deploy
```

---

## Step-by-Step Deployment

### Prerequisites

- gcloud CLI installed (`winget install Google.CloudSDK`)
- Authenticated: `gcloud auth login`
- Billing enabled on project `gdg-registration-492219`

### 1. Create Infrastructure (one-time)

```bash
chmod +x scripts/create-infrastructure.sh
bash scripts/create-infrastructure.sh
```

This provisions:
- Compute Engine VM (`gdg-bwai-vm`, e2-small, 10GB balanced disk)
- Firewall rules (TCP 80, 443)
- GCS bucket (`gdg-bwai-postgres-backups`) with 30-day lifecycle
- Service account (`gdg-postgres-backup-sa`) with GCS write access
- Downloads SA key to `deploy/backup-sa-key.json`

### 2. Set Up the VM (one-time)

> **Windows users:** `gcloud compute ssh` uses PuTTY and does not support stdin redirection (`< file`). Use `scp` + `--command` instead.

```bash
# Copy the setup script to the VM
gcloud compute scp deploy/vm-setup.sh gdg-bwai-vm:/tmp/vm-setup.sh --zone=us-central1-a

# Run it on the VM
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a --command="bash /tmp/vm-setup.sh"
```

This installs: Docker, Docker Compose plugin, Google Cloud SDK, Git.

### 3. Create Production `.env`

```bash
cp deploy/.env.example deploy/.env
```

Edit `deploy/.env` and fill in all values:

```env
DB_USER=postgres
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_NAME=gdg_bwai
JWT_SECRET=LONG_RANDOM_SECRET
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=STRONG_ADMIN_PASSWORD
RESEND_API_KEY=re_YOUR_KEY
FRONTEND_URL=http://YOUR_VM_EXTERNAL_IP
APP_URL=http://YOUR_VM_EXTERNAL_IP/api
PORT=3000
```

> `deploy/.env` and `deploy/backup-sa-key.json` are gitignored — never commit them.

### 4. Deploy

```bash
# Edit REPO_URL in scripts/deploy.sh first, then:
chmod +x scripts/deploy.sh
bash scripts/deploy.sh
```

This:
1. Gets the VM external IP
2. SCPs `.env` and `backup-sa-key.json` to the VM
3. Clones/pulls the repo on the VM
4. Runs `docker compose up --build -d`

### 5. Install Postgres Backup Cron (one-time)

```bash
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a
```

Once inside the VM:

```bash
bash /opt/gdg-bwai/deploy/install-backup-cron.sh
```

Follow the prompts — it will ask for DB credentials and GCS bucket name, then install a **daily 2 AM cron job** that:
1. Runs `pg_dump` inside the postgres container
2. Compresses to `.sql.gz`
3. Uploads to `gs://gdg-bwai-postgres-backups/daily/`
4. GCS lifecycle auto-deletes backups older than 30 days

Test the backup manually:
```bash
bash /opt/gdg-bwai/deploy/postgres-backup.sh
```

---

## CI/CD — GitHub Actions

Every push to `main` automatically deploys. Add these secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `GCP_SA_KEY` | JSON contents of a GCP service account with Compute SSH access |
| `GCP_PROJECT_ID` | `gdg-registration-492219` |
| `GCP_VM_NAME` | `gdg-bwai-vm` |
| `GCP_ZONE` | `us-central1-a` |
| `DB_PASSWORD` | Postgres password |
| `DB_USER` | `postgres` |
| `DB_NAME` | `gdg_bwai` |
| `JWT_SECRET` | JWT signing secret |
| `ADMIN_EMAIL` | Admin seed email |
| `ADMIN_PASSWORD` | Admin seed password |
| `RESEND_API_KEY` | Resend email API key |
| `FRONTEND_URL` | `http://YOUR_VM_IP` |
| `APP_URL` | `http://YOUR_VM_IP/api` |

---

## Useful Commands

### Check running containers
```bash
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a --command="docker compose -f /opt/gdg-bwai/docker-compose.yml ps"
```

### View logs
```bash
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a --command="docker compose -f /opt/gdg-bwai/docker-compose.yml logs --tail=100"
```

### Restart all containers
```bash
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a --command="cd /opt/gdg-bwai && docker compose restart"
```

### List GCS backups
```bash
gcloud storage ls gs://gdg-bwai-postgres-backups/daily/
```

### Restore a backup
```bash
# On the VM:
gcloud storage cp gs://gdg-bwai-postgres-backups/daily/YYYYMMDD_HHMMSS.sql.gz /tmp/restore.sql.gz
gunzip /tmp/restore.sql.gz
docker exec -i gdg_postgres psql -U postgres gdg_bwai < /tmp/restore.sql
```

---

## Windows SSH Workaround

`gcloud compute ssh` on Windows spawns PuTTY which does **not** support stdin redirection (`< file`). Always use the `scp` + `--command` pattern:

```bash
# Instead of:
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a -- 'bash -s' < script.sh

# Do this:
gcloud compute scp script.sh gdg-bwai-vm:/tmp/script.sh --zone=us-central1-a
gcloud compute ssh gdg-bwai-vm --zone=us-central1-a --command="bash /tmp/script.sh"
```

---

## Notes

- **Disk space:** 10 GB is tight. Docker images (~500 MB) + OS + Postgres data leaves limited headroom. Monitor with `df -h` on the VM. Upgrade to 20 GB if needed.
- **SSL/HTTPS:** To add HTTPS, SSH into the VM and run `certbot --nginx` (requires a domain name pointed at the VM IP).
- **Swagger docs:** Available at `http://YOUR_VM_IP/api/docs` after deployment.
