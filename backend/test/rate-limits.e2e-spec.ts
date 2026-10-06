/*
 * Runs the compiled backend (src/main.ts) as a real process against a throwaway Postgres database.
 * Env: E2E_DB_HOST (localhost), E2E_DB_PORT (5432), E2E_DB_USER (postgres),
 *      E2E_DB_PASSWORD (postgres), E2E_DB_MAINTENANCE_DB (postgres).
 * Run: npm run test:e2e
 * Clients are told apart by the X-Forwarded-For header nginx appends (trust proxy = 1 hop).
 */
import {
  Backend,
  newClientIp,
  ROOT_ADMIN,
  startBackend,
} from './support/backend';

let backend: Backend;

beforeAll(async () => {
  backend = await startBackend();
});

afterAll(async () => {
  await backend?.shutdown();
});

async function failedLogins(times: number, forwardedFor: () => string) {
  const statuses: number[] = [];
  for (let i = 0; i < times; i++) {
    const res = await backend.login(
      ROOT_ADMIN.email,
      `wrong-password-${i}`,
      forwardedFor(),
    );
    statuses.push(res.status);
  }
  return statuses;
}

async function posts(times: number, path: string, ip: string) {
  const client = backend.fromClientIp(ip);
  const statuses: number[] = [];
  for (let i = 0; i < times; i++)
    statuses.push((await client.post(path, {})).status);
  return statuses;
}

test('a client gets thirty login attempts a minute', async () => {
  const ip = newClientIp();

  const statuses = await failedLogins(30, () => ip);

  expect(statuses).toEqual(Array(30).fill(401));
});

test('the thirty-first login attempt in a minute from one client is refused with 429', async () => {
  const ip = newClientIp();

  const statuses = await failedLogins(31, () => ip);

  expect(statuses).toEqual([...Array(30).fill(401), 429]);
});

test('a client blocked from logging in does not block a different client', async () => {
  const blocked = newClientIp();
  const statuses = await failedLogins(31, () => blocked);

  const res = await backend.login(
    ROOT_ADMIN.email,
    ROOT_ADMIN.password,
    newClientIp(),
  );

  expect(statuses).toEqual([...Array(30).fill(401), 429]);
  expect(res.status).toBe(201);
});

test('a client cannot dodge the login limit by sending its own X-Forwarded-For', async () => {
  const realIp = newClientIp();

  const statuses = await failedLogins(31, () => `${newClientIp()}, ${realIp}`);

  expect(statuses).toEqual([...Array(30).fill(401), 429]);
});

test('a client blocked from logging in can still browse public events', async () => {
  const ip = newClientIp();
  await failedLogins(31, () => ip);

  const res = await backend.fromClientIp(ip).get('/events');

  expect(res.status).toBe(200);
});

test.each(['/registrations', '/registrations/team'])(
  'the thirty-first POST %s in a minute from one client is refused with 429',
  async (path) => {
    const statuses = await posts(31, path, newClientIp());

    expect(statuses.slice(0, 30)).not.toContain(429);
    expect(statuses[30]).toBe(429);
  },
);

test('one busy client does not use up the request allowance of another client', async () => {
  const busy = backend.fromClientIp(newClientIp());
  let busyStatus = 200;
  // The public event pages allow 300 a minute per client (a campus shares one address).
  for (let i = 0; i < 350 && busyStatus !== 429; i++)
    busyStatus = (await busy.get('/events')).status;

  const res = await backend.fromClientIp(newClientIp()).get('/events');

  expect(busyStatus).toBe(429);
  expect(res.status).toBe(200);
});
