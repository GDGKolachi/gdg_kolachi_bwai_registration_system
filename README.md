# GDG Kolachi — Build with AI Workshop Registration System

A full-stack workshop registration system for GDG Kolachi's "Build with AI" workshop series. Attendees can browse workshops, register, and request exceptions for additional workshops. Admins manage workshops, review registrations, process exception requests, and handle day-of check-in.

**Live:** https://register.gdgkolachi.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL 16 |
| Email | Resend |
| Auth | JWT (Passport) |
| Deployment | GCP Compute Engine (Docker Compose) |
| CI/CD | GitHub Actions (build check + auto-deploy on push to main) |
| SSL | Let's Encrypt (auto-renewal via Certbot) |
| Backups | Daily pg_dump to Google Cloud Storage (30-day retention) |
| E2E tests | Playwright (`frontend/e2e`) |

## Core Business Rule

An attendee (identified by email) can register for **only one workshop**. To attend any additional workshop, they must submit an **exception request** per workshop with a reason. An admin manually approves or rejects each exception from the dashboard.

## Frontend Architecture (Clean Architecture)

Feature-based folder structure with **4 separation layers** per feature:

```
frontend/src/
├── axios-instance.js              # Configured Axios with base URL, interceptors
├── main.jsx                       # App entry with React Query + Router providers
├── App.jsx                        # Route definitions
│
├── features/
│   ├── workshops/                 # Public workshop browsing
│   │   ├── workshop-api.js        # Raw HTTP calls (GET /workshops, GET /workshops/:id)
│   │   ├── workshop-adapter.js    # Transform API response → frontend shape
│   │   ├── workshop-repository.js # React Query hooks (useWorkshops, useWorkshopById)
│   │   ├── workshop-service.js    # Business logic (capacity checks, status logic)
│   │   ├── views/
│   │   │   ├── workshop-list.jsx  # Landing page — all workshops
│   │   │   └── workshop-detail.jsx
│   │   └── components/
│   │       ├── workshop-card.jsx
│   │       ├── capacity-badge.jsx
│   │       ├── markdown-text.jsx  # Markdown rendering (marked + DOMPurify)
│   │       ├── map-embed.jsx      # Google Maps iframe embed
│   │       └── speakers-list.jsx  # Speaker/facilitator cards
│   │
│   ├── registration/              # Attendee registration flow
│   │   ├── registration-api.js
│   │   ├── registration-adapter.js
│   │   ├── registration-repository.js
│   │   ├── registration-service.js
│   │   ├── views/
│   │   │   ├── registration-form.jsx
│   │   │   └── registration-confirmation.jsx
│   │   └── components/
│   │       ├── attendee-form-fields.jsx
│   │       └── motivation-field.jsx
│   │
│   ├── exceptions/                # Exception request for multi-workshop
│   │   ├── exception-api.js
│   │   ├── exception-adapter.js
│   │   ├── exception-repository.js
│   │   ├── exception-service.js
│   │   ├── views/
│   │   │   └── exception-request-form.jsx
│   │   └── components/
│   │       └── exception-status-badge.jsx
│   │
│   └── admin/                     # Admin panel
│       ├── auth/                  # Login
│       ├── dashboard/             # Stats overview
│       ├── workshop-management/   # Workshop CRUD
│       ├── registrations/         # Per-workshop list + CSV export
│       ├── exception-review/      # Approve/reject pending requests
│       └── checkin/               # Day-of check-in with search
│
└── shared/
    ├── components/                # Layout, AdminLayout
    ├── hooks/                     # useDebounce
    └── utils/                     # formatDate
```

### Layer Responsibilities

| Layer | File | Role |
|-------|------|------|
| API | `*-api.js` | Raw HTTP calls via Axios |
| Adapter | `*-adapter.js` | Transforms API response → frontend-friendly shape |
| Repository | `*-repository.js` | React Query hooks — caching, invalidation, stale time |
| Service | `*-service.js` | Business logic, validation |
| Views | `views/*.jsx` | Page-level components, consume repository for reads |
| Components | `components/*.jsx` | Reusable UI components |

## Backend Architecture (NestJS)

```
backend/src/
├── main.ts                        # Bootstrap with CORS, validation, global prefix
├── app.module.ts                  # Root module with TypeORM + all feature modules
│
├── entities/                      # TypeORM entities (database schema)
│   ├── admin.entity.ts
│   ├── workshop.entity.ts
│   ├── attendee.entity.ts
│   ├── registration.entity.ts
│   └── exception-request.entity.ts
│
├── auth/                          # JWT authentication
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts         # POST /api/auth/login
│   ├── strategies/jwt.strategy.ts
│   └── guards/jwt-auth.guard.ts
│
├── workshops/                     # Public workshop endpoints
│   ├── workshops.module.ts
│   ├── workshops.service.ts
│   ├── dto/create-workshop.dto.ts # Validation with class-validator
│   └── workshops.controller.ts    # GET /api/workshops, GET /api/workshops/:id
│
├── registrations/                 # Public registration endpoints
│   ├── registrations.module.ts
│   ├── registrations.service.ts
│   └── registrations.controller.ts # POST /api/registrations, GET /api/registrations/check-email
│
├── exceptions/                    # Public exception submission
│   ├── exceptions.module.ts
│   ├── exceptions.service.ts
│   └── exceptions.controller.ts   # POST /api/exceptions
│
├── admin/                         # Admin endpoints (JWT-protected)
│   ├── admin.module.ts
│   ├── admin.service.ts
│   └── admin.controller.ts        # /api/admin/* (stats, CRUD, check-in, etc.)
│
├── email/                         # Resend email + QR code generation
│   ├── email.module.ts
│   └── email.service.ts
│
└── seed/                          # Auto-seeds first admin on startup
    ├── seed.module.ts
    └── seed.service.ts
```

## Database Schema

```
admins:             id, email, password_hash, name, created_at
workshops:          id, title, description, date, time, venue, max_capacity, map_location, speakers (jsonb), status, created_at
attendees:          id, name, email (unique), phone, university_org, github_linkedin, cnic, created_at
registrations:      id, attendee_id, workshop_id, motivation, status, checked_in, registered_at, checked_in_at
exception_requests: id, attendee_id, requested_workshop_id, reason, status, reviewed_by, reviewed_at, created_at
```

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workshops` | List all workshops with registration counts |
| GET | `/api/workshops/:id` | Get workshop detail |
| GET | `/api/registrations/check-email?email=` | Check if email is already registered |
| POST | `/api/registrations` | Register for a workshop |
| POST | `/api/exceptions` | Submit an exception request |
| POST | `/api/auth/login` | Admin login (returns JWT) |

### Admin (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/workshops` | List all workshops |
| POST | `/api/admin/workshops` | Create workshop |
| PATCH | `/api/admin/workshops/:id` | Update workshop |
| DELETE | `/api/admin/workshops/:id` | Delete workshop |
| GET | `/api/admin/registrations?workshop_id=` | Registrations per workshop |
| GET | `/api/admin/registrations/export?workshop_id=` | CSV export |
| GET | `/api/admin/exceptions` | All exception requests |
| PATCH | `/api/admin/exceptions/:id/approve` | Approve exception |
| PATCH | `/api/admin/exceptions/:id/reject` | Reject exception |
| GET | `/api/admin/checkin/search?workshop_id=&q=` | Search attendees for check-in |
| PATCH | `/api/admin/checkin/:id/toggle` | Toggle check-in status |

## Email Notifications (Resend)

- Registration confirmed (workshop details + QR code)
- Exception request submitted (acknowledgment)
- Exception approved (new workshop details + QR code)
- Exception rejected (notification)

## Getting Started (Local Development)

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** running locally (or a remote connection string)
- **npm**

### 1. Clone the repo

```bash
git clone https://github.com/techymualim/gdg_kolachi_bwai_registration_system.git
cd gdg_kolachi_bwai_registration_system
```

### 2. Set up the database

```bash
createdb gdg_bwai
```

### 3. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your database credentials, JWT secret, admin credentials, and Resend API key. See `.env.example` for all required variables.

```bash
npm run start:dev
```

The backend will run TypeORM migrations on startup (`migrationsRun: true`) to create all tables, and seed the first admin account.

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access the app

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Public workshop listing |
| `http://localhost:5173/admin/login` | Admin login (credentials from your `.env`) |

## Deployment (GCP Compute Engine)

The app is deployed on a single GCP Compute Engine VM running Docker Compose with 3 containers: PostgreSQL, NestJS backend, and nginx (serving the React SPA + proxying `/api`).

See [DEPLOYMENT.md](DEPLOYMENT.md) for full step-by-step instructions.

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `scripts/create-infrastructure.sh` | Provisions VM, firewall, GCS bucket, service account |
| `deploy/vm-setup.sh` | Installs Docker, Compose, gcloud on the VM |
| `scripts/deploy.sh` | Deploys code + secrets to the VM |
| `deploy/postgres-backup.sh` | Daily automated PostgreSQL backup to GCS |

### CI/CD Pipeline

Every push to `main` triggers a GitHub Actions workflow:

1. **Build Check** — Builds both backend and frontend. If either fails, deploy is blocked.
2. **Deploy** — Pushes code to the VM and runs `docker compose up --build -d`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions, required secrets, and operational commands.

## Registration Flow

1. Attendee visits homepage, browses workshops
2. Clicks "Register" on an open workshop
3. System checks if their email is already registered
4. **First time:** Fills form → registration confirmed → confirmation email with QR code
5. **Already registered:** Blocked → redirected to exception request form
6. Exception goes to admin dashboard for review
7. **Approved** → new registration created + confirmation email
8. **Rejected** → rejection notification email
9. **At capacity** → workshop shows "full" message

## E2E Tests (Playwright)

Browser tests live under `frontend/e2e/`. See `frontend/e2e/README.md` for detail.

```bash
cd frontend
npm install
npx playwright install
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI
```

## Future Improvements

- **Custom domain email** — Use a custom sender domain with Resend instead of the default, for better deliverability
- **Waitlist system** — Allow attendees to join a waitlist when a workshop is full, auto-notify when spots open
- **Analytics dashboard** — Add charts for registration trends, attendance rates, and workshop popularity over time
- **Multi-event support** — Support multiple event series beyond "Build with AI" (e.g., DevFest, I/O Extended)
- **Image uploads** — Allow speaker photos and workshop banners to be uploaded directly instead of URL-based
- **Rate limiting** — Add rate limiting on public endpoints to prevent spam registrations
- **Email templates** — Move email HTML to template files for easier customization
- **Monitoring & alerts** — Set up uptime monitoring (e.g., Google Cloud Monitoring or UptimeRobot) and Slack alerts for downtime
- **Horizontal scaling** — Move to Cloud Run or GKE if traffic outgrows the single VM
- ~~**Database migrations** — Switch from TypeORM `synchronize: true` to proper migrations for production safety~~ ✅ Done
- **Automated SSL renewal** — Add a cron job that stops the frontend container, runs `certbot renew`, and restarts it
- **CDN** — Put Cloudflare or Cloud CDN in front of the nginx container for static asset caching and DDoS protection

## Branding

GDG Kolachi themed with the four Google colors:
- Blue: `#4285F4`
- Red: `#EA4335`
- Yellow: `#FBBC04`
- Green: `#34A853`
