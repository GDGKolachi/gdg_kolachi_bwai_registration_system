/*
 * Runs the compiled backend (src/main.ts) as a real process against a throwaway Postgres database.
 * Env: E2E_DB_HOST (localhost), E2E_DB_PORT (5432), E2E_DB_USER (postgres),
 *      E2E_DB_PASSWORD (postgres), E2E_DB_MAINTENANCE_DB (postgres).
 * Run: npm run test:e2e
 */
import { Boot, bootBackend, Database, ROOT_ADMIN } from './support/backend';

let db: Database;
let boots: Boot[];

beforeEach(async () => {
  db = await Database.create();
  boots = [];
});

afterEach(async () => {
  for (const boot of boots) await boot.backend?.stop();
  await db.drop();
});

async function boot(env: Record<string, string | undefined>) {
  const result = await bootBackend(db, env);
  boots.push(result);
  return result;
}

function adminAccounts() {
  return db.query<{ email: string; role: string }>(
    'SELECT email, role FROM admins ORDER BY email',
  );
}

test('a fresh backend with an empty ADMIN_PASSWORD starts without creating any admin', async () => {
  const result = await boot({
    ADMIN_EMAIL: 'first.admin@example.com',
    ADMIN_PASSWORD: '',
  });

  expect(result.started).toBe(true);
  expect(await adminAccounts()).toEqual([]);
});

test('a fresh backend with no ADMIN_EMAIL or ADMIN_PASSWORD starts without the default admin@gdgkolachi.com account', async () => {
  const result = await boot({
    ADMIN_EMAIL: undefined,
    ADMIN_PASSWORD: undefined,
  });

  expect(result.started).toBe(true);
  expect(await adminAccounts()).toEqual([]);
});

test('nobody can sign in with admin123 on a fresh backend that has no ADMIN_PASSWORD', async () => {
  const result = await boot({
    ADMIN_EMAIL: undefined,
    ADMIN_PASSWORD: undefined,
  });

  const res = await result.backend!.login('admin@gdgkolachi.com', 'admin123');

  expect(res.status).toBe(401);
});

test('a fresh backend creates the first super admin from ADMIN_EMAIL and ADMIN_PASSWORD', async () => {
  const result = await boot({});

  const res = await result.backend!.login(
    ROOT_ADMIN.email,
    ROOT_ADMIN.password,
  );

  expect(res.status).toBe(201);
  expect(res.body.user).toMatchObject({
    email: ROOT_ADMIN.email,
    role: 'super_admin',
  });
  expect(await adminAccounts()).toEqual([
    { email: ROOT_ADMIN.email, role: 'super_admin' },
  ]);
});

test('a backend that already has admins starts without ADMIN_PASSWORD and its admins can still sign in', async () => {
  const first = await boot({});
  await first.backend!.stop();

  const second = await boot({ ADMIN_PASSWORD: undefined });

  expect(second.started).toBe(true);
  expect(
    (await second.backend!.login(ROOT_ADMIN.email, ROOT_ADMIN.password)).status,
  ).toBe(201);
});
