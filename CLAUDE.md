# CLAUDE.md — project context

## Stack
- Frontend: React + Vite + Tailwind, React Query, react-router. `frontend/src`
- Backend: NestJS + TypeORM + Postgres 16, JWT (Passport), Resend email, throttler (100 req/min). `backend/src`
- Deploy: Docker Compose on a GCP VM (postgres, backend, nginx+SPA); GitHub Actions build check + deploy on push to main; daily pg_dump to GCS (`deploy/`, `DEPLOYMENT.md`).
- Tests: Playwright e2e (`frontend/e2e`), Jest unit/e2e in backend (`credits.*.spec.ts`, `test/`).
- Migrations run on startup (`migrationsRun: true`, `synchronize: false`); latest set in `backend/src/migrations/` (multi-event redesign, ambassador, ack lock, team registration, admin roles + soft delete, team payment, cloud credits).
- README is partly stale (still says "workshops"; code is now "events" with event types).

## Domain model (entities in `backend/src/entities`)
- `EventType` (workshop / talks / community lounge / hackathon) -> `Event` (title, date, venue, max_capacity, status upcoming|registration_open|closed|disabled, allow_exceptions, is_online, tracks/slots jsonb for lounge, acknowledgement_deadline/locked, credits_enabled/claim_url/video_url).
- `Attendee` (unique email; name, phone, university_org, github, linkedin, cnic, gender, best_describes_you) -> `Registration` (event_id, status pending|shortlisted|confirmed|rejected|attended, checked_in, qr_code_data, acknowledged/acknowledgement_expired, domain, track, slot, role_bucket, ambassador, registration_mode individual|team, is_captain, shortlisting answers: years_experience, prior_hackathons, skills[], ai_experience, portfolio_url, best_project; soft delete via deleted_at/deleted_by).
- `ExceptionRequest` (attendee, requested event, reason, status, reviewed_by).
- Hackathon teams: `Team` (team_number, name, primary_domain, status forming|full|locked, origin auto|self_registered, captain, idea fields, deposit/payment_* workflow), `TeamMember` (role/domain snapshots, is_anchor), `TeamFormationConfig` (max teams/size, role targets, scoring weights), `RoleCategory` (best_describes_you -> bucket).
- `CreditRedemption` (one per registration; token, email send state machine, click funnel, redeemed_at/via).
- `Admin` with roles `super_admin` / `organizer` / `volunteer` (`common/enums/admin-role.enum.ts`; CHECKIN_ROLES = all three, ORGANIZER_ROLES = super+organizer).
- Hackathon option lists (domains, skills -> buckets, answer limits) live in `common/constants/hackathon.constants.ts`, mirrored on frontend in `features/registration/registration-constants.js` (keep in sync).

## Business rules
- Workshop type only: one registration per email across all workshops; extra ones need an admin-approved exception request (`ONE_PER_TYPE_SLUGS = ['workshop']` in `registrations.service.ts`). Every type blocks duplicate registration for the same event.
- Hackathon: solo or captain-submitted team registration (`POST /registrations/team`); shortlisting, then spot acknowledgement (`GET /registrations/:id/acknowledge`, deadline + admin lock + expired email), team deposit/payment confirmation.
- Status transitions validated in `AdminService.VALID_TRANSITIONS`.
- Check-in: QR scan / desk search / mobile / hackathon scan. Hackathon check-in auto-assigns the attendee to a team (`TeamAssignmentService.assignAtCheckin`, scoring by domain match + role gaps/overflow), with rebalance/lock/move/swap admin tools.
- Online events (`backend/src/online`): meeting_url/meeting_details go in every email as a personal "Check in & join" link (`/join/:token`, HMAC-signed registration id); `OnlineReminderScheduler` emails seated attendees `meeting_reminder_minutes` (default 30) before start (times read as `EVENT_UTC_OFFSET`, default +05:00); self check-in opens 15 min before, closes 4 h after, marks attended and queues the credits email.
- Cloud credits (`docs/cloud-credits.md`, `cloud-credits-event-day.md`): QR-scan check-in queues an idempotent email (in-process sender, rate-limited, retries/backoff) with video + claim link + "I've redeemed" confirm page `/credits/:token`; admins can resend/bulk-send/confirm on behalf.

## Backend module map
auth, admin (stats, events/registrations CRUD, status, CSV export, reminder/WhatsApp/ack-expired/rejection emails, QR scan, check-in, exceptions, users), events, event-types, registrations, exceptions, teams (+public team lookup and deposit), credits (admin + public controllers, sender, mailer, template), email (Resend + QR), seed (first admin), cli (`seed-hackathon-testdata.ts`).

## Public API
`GET /events`, `/events/:id`, `/event-types`; `GET /registrations/check-email`; `POST /registrations`, `/registrations/team`; `POST /exceptions`; `POST /auth/login`; `GET /events/:id/team-lookup`; `GET|POST /public/teams/:id/deposit`; `/public/credits/*`.
Admin API: under `/admin/*` (JWT + RolesGuard; class-level organizer roles, check-in endpoints opt in to volunteers; users endpoints super-admin only), `/admin/credits/*`, team endpoints in `teams.controller.ts` (JwtAuthGuard).

## Frontend map (`frontend/src`)
Feature-based layers (api -> adapter -> repository (React Query) -> service -> views/components) under `features/`: `events`, `registration`, `exceptions`, `teams` (lookup + deposit), `credits-public`, and `admin/` (auth, dashboard, event-management, event-types, registrations, exception-review, checkin, mobile-checkin, hackathon-checkin, qr-scan, teams, credits, users). Routes in `App.jsx`: public (`/`, `/events/:id`, `/register/:eventId`, `/exception-request/:eventId`, `/my-team`, `/teams/:teamId/deposit`, `/credits/:token`, `/credits/resend`), admin gated by `AuthGate` with MANAGEMENT_ROLES / CHECKIN_ROLES / SUPER_ADMIN.

## Biggest files (where complexity lives)
`email/email.service.ts` (855), `admin/admin.service.ts` (929), `registrations/registrations.service.ts` (586), `teams/teams.service.ts` (540), `credits/credits.service.ts` (538), `teams/team-assignment.service.ts` (477).

