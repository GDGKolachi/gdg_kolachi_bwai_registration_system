# Playwright E2E

## Prerequisite

1. **PostgreSQL** + **Nest backend** running (`npm run start:dev` in `/backend`).
2. **Frontend** `.env`: `VITE_API_URL=http://localhost:3000/api` (adjust port if needed).
3. Seeded **admin** (defaults match `E2E_ADMIN_*` below).

## Install

From `frontend/`:

```bash
npm install
npx playwright install
```

## Run

Terminal 1 — backend:

```bash
cd backend && npm run start:dev
```

Terminal 2 — tests (starts Vite via `webServer` if not already running):

```bash
cd frontend && npm run test:e2e
```

Other:

```bash
npm run test:e2e:ui      # interactive
npm run test:e2e:headed  # headed browser
npm run test:e2e:report  # last HTML report
```

## Screenshots & traces

- **Screenshots:** After **every** test (pass or fail) — see `screenshot: 'on'` in `playwright.config.ts`; open the HTML report to view them.
- **Traces:** On **first retry** of a failed test only (`trace: 'on-first-retry'`).

## Environment

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | Frontend URL (default `http://localhost:5173`) |
| `PLAYWRIGHT_API_URL` | API origin for helpers (default `http://localhost:3000`) |
| `E2E_ADMIN_EMAIL` | Admin email for `auth.setup.ts` |
| `E2E_ADMIN_PASSWORD` | Admin password |

## Layout

- `auth.setup.ts` — logs in, saves `e2e/.auth/admin.json` (gitignored).
- `public/*.spec.ts` — no auth (workshops, registration, exception form, bad login).
- `admin/*.spec.ts` — reuse admin storage state.
- `helpers/api.ts` — `GET /api/workshops` for open workshop id, etc.

## Skips

- **Registration** test skips if no workshop has `status === 'open'`.
- **Workshop detail** skips if API returns no workshops.

Create/set an open workshop in admin before expecting registration E2E to run.
