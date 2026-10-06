/*
 * Runs the compiled backend (src/main.ts) as a real process against a throwaway Postgres database.
 * Env: E2E_DB_HOST (localhost), E2E_DB_PORT (5432), E2E_DB_USER (postgres),
 *      E2E_DB_PASSWORD (postgres), E2E_DB_MAINTENANCE_DB (postgres).
 * Run: npm run test:e2e
 */
import { Response } from 'supertest';
import {
  AdminSession,
  Backend,
  startBackend,
  uniqueTag,
} from './support/backend';
import {
  givenEvent,
  givenTeam,
  SeededEvent,
  SeededTeam,
  waitingAtTheDoor,
} from './support/event-day';

interface Scene {
  hackathon: SeededEvent;
  team: SeededTeam;
  otherTeam: SeededTeam;
  eventTypeId: string;
}

let backend: Backend;

beforeAll(async () => {
  backend = await startBackend();
});

afterAll(async () => {
  await backend?.shutdown();
});

async function givenHackathonWithTeams(): Promise<Scene> {
  const hackathon = await givenEvent(backend, 'hackathon', { crowd: 120 });
  const [a, b, c, d, e, f, g] = waitingAtTheDoor(hackathon, 7);
  const team = await givenTeam(backend, hackathon, [a, b, c, d], {
    selfRegistered: true,
    deposit: 'submitted',
  });
  const otherTeam = await givenTeam(backend, hackathon, [e, f, g]);
  const root = await backend.rootAdmin();
  const tag = uniqueTag();
  const created = await root.post('/admin/event-types', {
    name: `Study Jam ${tag}`,
    slug: `study-jam-${tag}`,
    description: 'Self-paced codelab session',
  });
  return { hackathon, team, otherTeam, eventTypeId: created.body.id };
}

const organizerWork: Array<
  [string, (v: AdminSession, s: Scene) => Promise<Response>]
> = [
  [
    'email a team',
    (v, s) =>
      v.post('/admin/teams/message', {
        team_ids: [s.team.id],
        subject: 'Venue change',
        message: 'We moved to Hall B.',
      }),
  ],
  [
    'ask teams for their deposit',
    (v, s) => v.post('/admin/teams/request-payment', { team_ids: [s.team.id] }),
  ],
  [
    'confirm a team deposit',
    (v, s) => v.post(`/admin/teams/${s.team.id}/payment/confirm`),
  ],
  [
    'reject a team deposit',
    (v, s) =>
      v.post(`/admin/teams/${s.team.id}/payment/reject`, {
        reason: 'Amount did not match',
      }),
  ],
  [
    'change a team status',
    (v, s) =>
      v.patch(`/admin/teams/${s.team.id}/status`, { status: 'shortlisted' }),
  ],
  ['read a team roster', (v, s) => v.get(`/admin/teams/${s.team.id}`)],
  [
    'read the team formation settings',
    (v, s) => v.get(`/admin/events/${s.hackathon.id}/team-formation-config`),
  ],
  [
    'change the team formation settings',
    (v, s) =>
      v.patch(`/admin/events/${s.hackathon.id}/team-formation-config`, {
        max_team_size: 6,
      }),
  ],
  [
    'move a member to another team',
    (v, s) =>
      v.patch(
        `/admin/teams/${s.otherTeam.id}/members/${s.team.members[1].registrationId}/move`,
      ),
  ],
  [
    'swap two team members',
    (v, s) =>
      v.patch('/admin/teams/swap-members', {
        registrationIdA: s.team.members[1].registrationId,
        registrationIdB: s.otherTeam.members[1].registrationId,
      }),
  ],
  [
    'reshuffle the teams of an event',
    (v, s) => v.post(`/admin/events/${s.hackathon.id}/teams/optimize`),
  ],
  [
    'lock the teams of an event',
    (v, s) => v.post(`/admin/events/${s.hackathon.id}/teams/lock`),
  ],
  ['unlock a team', (v, s) => v.post(`/admin/teams/${s.team.id}/unlock`)],
  ['list event types in the admin panel', (v) => v.get('/admin/event-types')],
  [
    'create an event type',
    (v) =>
      v.post('/admin/event-types', {
        name: `Design Sprint ${uniqueTag()}`,
        slug: `design-sprint-${uniqueTag()}`,
      }),
  ],
  [
    'rename an event type',
    (v, s) =>
      v.patch(`/admin/event-types/${s.eventTypeId}`, {
        name: `Renamed by volunteer ${uniqueTag()}`,
      }),
  ],
  [
    'delete an event type',
    (v, s) => v.delete(`/admin/event-types/${s.eventTypeId}`),
  ],
];

describe('volunteers are kept out of organizer work', () => {
  test.each(organizerWork)('a volunteer cannot %s', async (_, attempt) => {
    const scene = await givenHackathonWithTeams();
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await attempt(volunteer, scene);

    expect(res.status).toBe(403);
  });

  test('a volunteer trying to confirm a deposit leaves the deposit unconfirmed', async () => {
    const scene = await givenHackathonWithTeams();
    const volunteer = await backend.givenAdmin('volunteer');
    const organizer = await backend.givenAdmin('organizer');

    await volunteer.post(`/admin/teams/${scene.team.id}/payment/confirm`);

    const team = await organizer.get(`/admin/teams/${scene.team.id}`);
    expect(team.body.payment_status).toBe('submitted');
  });

  test('a volunteer trying to delete an event type leaves it active', async () => {
    const scene = await givenHackathonWithTeams();
    const volunteer = await backend.givenAdmin('volunteer');

    await volunteer.delete(`/admin/event-types/${scene.eventTypeId}`);

    const active = await backend.anonymous.get('/event-types?active=true');
    expect(active.body.map((t: { id: string }) => t.id)).toContain(
      scene.eventTypeId,
    );
  });

  test('a volunteer trying to rename an event type leaves its name unchanged', async () => {
    const scene = await givenHackathonWithTeams();
    const volunteer = await backend.givenAdmin('volunteer');
    const before = await backend.anonymous.get('/event-types');
    const original = before.body.find(
      (t: { id: string }) => t.id === scene.eventTypeId,
    ).name;

    await volunteer.patch(`/admin/event-types/${scene.eventTypeId}`, {
      name: `Renamed by volunteer ${uniqueTag()}`,
    });

    const after = await backend.anonymous.get('/event-types');
    expect(
      after.body.find((t: { id: string }) => t.id === scene.eventTypeId).name,
    ).toBe(original);
  });

  test('organizers can still confirm a team deposit', async () => {
    const scene = await givenHackathonWithTeams();
    const organizer = await backend.givenAdmin('organizer');

    await organizer.post(`/admin/teams/${scene.team.id}/payment/confirm`);

    const team = await organizer.get(`/admin/teams/${scene.team.id}`);
    expect(team.body.payment_status).toBe('paid');
  });
});
