/*
 * Runs the compiled backend (src/main.ts) as a real process against a throwaway Postgres database.
 * Env: E2E_DB_HOST (localhost), E2E_DB_PORT (5432), E2E_DB_USER (postgres),
 *      E2E_DB_PASSWORD (postgres), E2E_DB_MAINTENANCE_DB (postgres).
 * Run: npm run test:e2e
 */
import { Backend, startBackend } from './support/backend';
import { eventTypeId } from './support/event-day';

const BUILT_IN_SLUGS = ['community-lounge', 'hackathon', 'talks', 'workshop'];

let backend: Backend;

beforeEach(async () => {
  backend = await startBackend();
});

afterEach(async () => {
  await backend?.shutdown();
});

async function eventTypes(b: Backend) {
  const res = await b.anonymous.get('/event-types');
  return res.body as Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
  }>;
}

test('an organizer cannot change the slug of an event type', async () => {
  const organizer = await backend.givenAdmin('organizer');
  const workshopId = await eventTypeId(backend, 'workshop');

  const res = await organizer.patch(`/admin/event-types/${workshopId}`, {
    slug: 'workshops',
  });

  expect(res.status).toBe(400);
  expect(
    (await eventTypes(backend)).find((t) => t.id === workshopId)?.slug,
  ).toBe('workshop');
});

test('an organizer cannot change the slug of an event type they created', async () => {
  const organizer = await backend.givenAdmin('organizer');
  const created = await organizer.post('/admin/event-types', {
    name: 'Study Jam',
    slug: 'study-jam',
  });

  const res = await organizer.patch(`/admin/event-types/${created.body.id}`, {
    name: 'Study Jam',
    slug: 'study-jams',
  });

  expect(res.status).toBe(400);
  expect(
    (await eventTypes(backend)).find((t) => t.id === created.body.id)?.slug,
  ).toBe('study-jam');
});

test('the backend restarts cleanly after an organizer tries to change a built-in slug', async () => {
  const organizer = await backend.givenAdmin('organizer');
  await organizer.patch(
    `/admin/event-types/${await eventTypeId(backend, 'workshop')}`,
    {
      name: 'Workshop',
      slug: 'workshop-legacy',
    },
  );

  const restart = await backend.restart();

  expect(restart.started).toBe(true);
  expect(
    (await eventTypes(restart.backend!)).map((t) => t.slug).sort(),
  ).toEqual(BUILT_IN_SLUGS);
});

test('an organizer can rename an event type and edit its description when the slug is sent unchanged', async () => {
  const organizer = await backend.givenAdmin('organizer');
  const talksId = await eventTypeId(backend, 'talks');

  const res = await organizer.patch(`/admin/event-types/${talksId}`, {
    name: 'Tech Talks',
    slug: 'talks',
    description: 'Speaker sessions — اردو میں بھی',
    is_active: true,
  });

  expect(res.status).toBe(200);
  expect(
    (await eventTypes(backend)).find((t) => t.id === talksId),
  ).toMatchObject({
    name: 'Tech Talks',
    slug: 'talks',
    description: 'Speaker sessions — اردو میں بھی',
  });
});

test('an organizer can create an event type with its own slug', async () => {
  const organizer = await backend.givenAdmin('organizer');

  const res = await organizer.post('/admin/event-types', {
    name: 'Study Jam',
    slug: 'study-jam',
    description: 'Self-paced codelab session',
  });

  expect(res.status).toBe(201);
  expect((await eventTypes(backend)).map((t) => t.slug).sort()).toEqual(
    [...BUILT_IN_SLUGS, 'study-jam'].sort(),
  );
});
