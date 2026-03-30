# GDG Kolachi — Build with AI Workshop Registration System

A full-stack workshop registration system for GDG Kolachi's "Build with AI" workshop series. Attendees can browse workshops, register, and request exceptions for additional workshops. Admins manage workshops, review registrations, process exception requests, and handle day-of check-in.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL |
| Email | Resend |
| Auth | JWT (Passport) |
| Deployment | Vercel (frontend) + Railway (backend + DB) |
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
│   │       └── capacity-badge.jsx
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
workshops:          id, title, description, date, time, venue, max_capacity, status, created_at
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

## Getting Started

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

Create a PostgreSQL database:

```bash
createdb gdg_bwai
```

Or using psql:

```sql
CREATE DATABASE gdg_bwai;
```

### 3. Set up the backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gdg_bwai
JWT_SECRET=your-secret-key-change-this
ADMIN_EMAIL=admin@gdgkolachi.com
ADMIN_PASSWORD=admin123
RESEND_API_KEY=re_your_resend_api_key   # Optional — emails are skipped if not set
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Start the backend:

```bash
# Development (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The backend will:
- Auto-create all database tables via TypeORM synchronize
- Seed the first admin account on startup (using ADMIN_EMAIL/ADMIN_PASSWORD from .env)
- Listen on `http://localhost:3000`

### 4. Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend:

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

The frontend will be available at `http://localhost:5173`.

### 5. Access the app

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Public workshop listing |
| `http://localhost:5173/admin/login` | Admin login |

Default admin credentials (from .env):
- **Email:** `admin@gdgkolachi.com`
- **Password:** `admin123`

## E2E tests (Playwright)

Browser tests live under `frontend/e2e/`. See `frontend/e2e/README.md` for detail.

### Setup

```bash
cd frontend
npm install
npx playwright install   # browsers (e.g. Chromium)
```

Requires **backend** running (`backend/npm run start:dev`) and `frontend/.env` with `VITE_API_URL` pointing at the API (e.g. `http://localhost:3000/api`).

### Run

```bash
cd frontend
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI
npm run test:e2e:headed   # headed
npm run test:e2e:report   # open last HTML report
```

Optional env: `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` (must match a real admin in the DB for the setup project).

### Artifacts (screenshots & traces)

- **Screenshots:** Captured **after every test** (pass and fail) and attached to the HTML report (`screenshot: 'on'` in `playwright.config.ts`).
- **Traces:** Recorded **on first retry** of a failed test (`trace: 'on-first-retry'`), useful for debugging flakes in CI.

### Covered scenarios

| Area | Spec | What is covered |
|------|------|------------------|
| **Setup** | `e2e/auth.setup.ts` | Admin login; saves session for admin specs |
| **Public — workshops** | `e2e/public/workshops.spec.ts` | Home “Build with AI” title; list has cards or empty state; open workshop **Details** → detail page |
| **Public — registration** | `e2e/public/registration.spec.ts` | Full register flow for first **open** workshop → confirmation page (skipped if no open workshop) |
| **Public — exception** | `e2e/public/exception-request.spec.ts` | Exception request form loads for an existing workshop |
| **Public — login** | `e2e/public/auth-login.spec.ts` | Invalid admin credentials stay on `/admin/login` |
| **Admin — dashboard** | `e2e/admin/dashboard.spec.ts` | Dashboard heading and stats |
| **Admin — workshops** | `e2e/admin/workshops.spec.ts` | Workshops page; open **New Workshop** modal; cancel |
| **Admin — registrations** | `e2e/admin/registrations.spec.ts` | Registrations page; workshop `<select>` visible |
| **Admin — exceptions** | `e2e/admin/exceptions.spec.ts` | Exception requests heading |
| **Admin — check-in** | `e2e/admin/checkin.spec.ts` | Check-in heading, search field, Search button |
| **Admin — QR scan** | `e2e/admin/qr-scan.spec.ts` | QR scanner page; manual input + **Look Up** |
| **Admin — users** | `e2e/admin/users.spec.ts` | Users list; open **New User** modal; cancel |

Admin specs depend on **setup** (saved `e2e/.auth/admin.json`, gitignored). Some public tests **skip** when the API has no workshops or no **open** workshop.

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

## Deployment

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set environment variable in Vercel dashboard:
- `VITE_API_URL` = your Railway backend URL + `/api`

### Backend → Railway

1. Connect your repo to Railway
2. Set root directory to `backend`
3. Add environment variables (DATABASE_URL is auto-provided by Railway Postgres)
4. Railway uses the `Procfile` to start: `node dist/main.js`
5. Build command: `npm run build`

Required Railway environment variables:
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `RESEND_API_KEY`
- `FRONTEND_URL` (your Vercel URL)

## Branding

GDG Kolachi themed with the four Google colors:
- Blue: `#4285F4`
- Red: `#EA4335`
- Yellow: `#FBBC04`
- Green: `#34A853`
