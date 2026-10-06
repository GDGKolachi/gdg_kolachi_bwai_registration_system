/*
 * Runs the compiled backend (src/main.ts) as a real process against a throwaway Postgres database.
 * Env: E2E_DB_HOST (localhost), E2E_DB_PORT (5432), E2E_DB_USER (postgres),
 *      E2E_DB_PASSWORD (postgres), E2E_DB_MAINTENANCE_DB (postgres).
 * Run: npm run test:e2e
 */
import { Backend, startBackend } from './support/backend';
import { adminRoutes, routesWhere } from './support/admin-routes';

const EVENT_DAY_CHECKIN_ROUTES = [
  'GET /api/admin/events',
  'POST /api/admin/qr-scan',
  'PATCH /api/admin/qr-scan/{id}/attend',
  'GET /api/admin/checkin-stats/{eventId}',
  'GET /api/admin/checkin/search',
  'PATCH /api/admin/checkin/{id}/toggle',
  'GET /api/admin/events/{eventId}/teams',
  'POST /api/admin/hackathon-checkin/{registrationId}',
  'POST /api/admin/hackathon-checkin/{registrationId}/unassign',
].sort();

const ADMIN_ACCOUNT_ROUTES = [
  'GET /api/admin/users',
  'POST /api/admin/users',
  'PATCH /api/admin/users/{id}',
  'DELETE /api/admin/users/{id}',
].sort();

let backend: Backend;

beforeAll(async () => {
  backend = await startBackend();
});

afterAll(async () => {
  await backend?.shutdown();
});

test('a volunteer is refused on every admin route except event-day check-in', async () => {
  const volunteer = await backend.givenAdmin('volunteer');
  const routes = await adminRoutes(backend);

  const allowed = await routesWhere(
    volunteer,
    routes,
    (status) => status !== 403,
  );

  expect(allowed).toEqual(EVENT_DAY_CHECKIN_ROUTES);
});

test('an organizer is refused only on the admin account routes', async () => {
  const organizer = await backend.givenAdmin('organizer');
  const routes = await adminRoutes(backend);

  const refused = await routesWhere(
    organizer,
    routes,
    (status) => status === 403,
  );

  expect(refused).toEqual(ADMIN_ACCOUNT_ROUTES);
});

test('a super admin is refused on no admin route', async () => {
  const superAdmin = await backend.givenAdmin('super_admin');
  const routes = await adminRoutes(backend);

  const refused = await routesWhere(
    superAdmin,
    routes,
    (status) => status === 403,
  );

  expect(refused).toEqual([]);
});

test('a signed-out visitor gets 401 on every admin route', async () => {
  const routes = await adminRoutes(backend);

  const notRejected = await routesWhere(
    backend.anonymous,
    routes,
    (status) => status !== 401,
  );

  expect(notRejected).toEqual([]);
});

test('anyone can list the active event types without signing in', async () => {
  const res = await backend.anonymous.get('/event-types?active=true');

  expect(res.status).toBe(200);
  expect(res.body.map((t: { slug: string }) => t.slug).sort()).toEqual([
    'community-lounge',
    'hackathon',
    'talks',
    'workshop',
  ]);
});
