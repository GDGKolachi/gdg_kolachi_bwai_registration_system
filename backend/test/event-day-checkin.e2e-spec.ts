/*
 * Runs the compiled backend (src/main.ts) as a real process against a throwaway Postgres database.
 * Env: E2E_DB_HOST (localhost), E2E_DB_PORT (5432), E2E_DB_USER (postgres),
 *      E2E_DB_PASSWORD (postgres), E2E_DB_MAINTENANCE_DB (postgres).
 * Run: npm run test:e2e
 */
import { randomUUID } from 'node:crypto';
import { Backend, Role, startBackend } from './support/backend';
import {
  checkedInCount,
  deskCheckIn,
  deskRowOf,
  deskSearch,
  hackathonCheckIn,
  idsOf,
  markAttended,
  memberIdsOf,
  scanQr,
  teamList,
  teamNumberOf,
  undoHackathonCheckIn,
} from './support/checkin';
import {
  givenEvent,
  givenTeam,
  listOf,
  privateDetailsFoundIn,
  waitingAtTheDoor,
} from './support/event-day';

let backend: Backend;

beforeAll(async () => {
  backend = await startBackend();
});

afterAll(async () => {
  await backend?.shutdown();
});

describe('volunteers run event-day check-in', () => {
  test('a volunteer can list the events to choose one for check-in', async () => {
    const workshop = await givenEvent(backend, 'workshop', { crowd: 30 });
    const hackathon = await givenEvent(backend, 'hackathon', { crowd: 30 });
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await volunteer.get('/admin/events');

    expect(res.status).toBe(200);
    const events = listOf(res.body);
    expect(events.find((e) => e.id === workshop.id)).toMatchObject({
      title: workshop.title,
      event_type: { slug: 'workshop' },
    });
    expect(events.find((e) => e.id === hackathon.id)).toMatchObject({
      title: hackathon.title,
      event_type: { slug: 'hackathon' },
    });
  });

  test('a volunteer finds an attendee at the desk by part of their Urdu name', async () => {
    const workshop = await givenEvent(backend, 'workshop', {
      named: ['نرگس جمیل'],
    });
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await deskSearch(volunteer, workshop, 'نرگس');

    expect(res.status).toBe(200);
    expect(res.body.map((row: any) => row.id)).toEqual([
      workshop.person('نرگس جمیل').registrationId,
    ]);
  });

  test('the desk search ignores letter case', async () => {
    const workshop = await givenEvent(backend, 'workshop', {
      named: ['Rubab Hassan'],
    });
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await deskSearch(volunteer, workshop, 'RUBAB');

    expect(res.body.map((row: any) => row.attendee.name)).toEqual([
      'Rubab Hassan',
    ]);
  });

  test('the desk list leaves out deleted registrations', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await deskSearch(volunteer, workshop);

    expect(res.body.map((row: any) => row.id).sort()).toEqual(
      workshop.live.map((p) => p.registrationId).sort(),
    );
  });

  test('a volunteer checks an attendee in at the desk and the check-in count goes up by one', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const [guest] = waitingAtTheDoor(workshop, 1);
    const volunteer = await backend.givenAdmin('volunteer');
    const before = await checkedInCount(volunteer, workshop);

    const res = await deskCheckIn(volunteer, guest, { checked_in: true });

    expect(res.status).toBe(200);
    expect(await checkedInCount(volunteer, workshop)).toBe(before + 1);
  });

  test('checking the same attendee in twice counts them once', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const [guest] = waitingAtTheDoor(workshop, 1);
    const volunteer = await backend.givenAdmin('volunteer');
    const before = await checkedInCount(volunteer, workshop);

    await deskCheckIn(volunteer, guest, { checked_in: true });
    await deskCheckIn(volunteer, guest, { checked_in: true });

    expect(await checkedInCount(volunteer, workshop)).toBe(before + 1);
    expect((await deskRowOf(volunteer, workshop, guest)).checked_in).toBe(true);
  });

  test('a volunteer can un-check an attendee who was checked in by mistake', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const guest = workshop.live.find((p) => p.checkedIn)!;
    const volunteer = await backend.givenAdmin('volunteer');

    await deskCheckIn(volunteer, guest, { checked_in: false });
    await deskCheckIn(volunteer, guest, { checked_in: false });

    expect((await deskRowOf(volunteer, workshop, guest)).checked_in).toBe(
      false,
    );
  });

  test('a desk check-in sent without a body still flips the check-in state for older screens', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const [guest] = waitingAtTheDoor(workshop, 1);
    const volunteer = await backend.givenAdmin('volunteer');

    await deskCheckIn(volunteer, guest);
    const afterFirst = (await deskRowOf(volunteer, workshop, guest)).checked_in;
    await deskCheckIn(volunteer, guest);
    const afterSecond = (await deskRowOf(volunteer, workshop, guest))
      .checked_in;

    expect([afterFirst, afterSecond]).toEqual([true, false]);
  });

  test.each(['pending', 'rejected'])(
    'a %s registration cannot be checked in at the desk',
    async (status) => {
      const workshop = await givenEvent(backend, 'workshop');
      const guest = workshop.live.find((p) => p.status === status)!;
      const volunteer = await backend.givenAdmin('volunteer');

      const res = await deskCheckIn(volunteer, guest, { checked_in: true });

      expect(res.status).toBe(400);
      expect((await deskRowOf(volunteer, workshop, guest)).checked_in).toBe(
        false,
      );
    },
  );

  test('a deleted registration cannot be checked in at the desk', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const guest = workshop.people.find((p) => p.deleted && !p.checkedIn)!;
    const volunteer = await backend.givenAdmin('volunteer');
    const before = await checkedInCount(volunteer, workshop);

    const res = await deskCheckIn(volunteer, guest, { checked_in: true });

    expect(res.status).toBe(400);
    expect(await checkedInCount(volunteer, workshop)).toBe(before);
  });

  test('an attendee whose acknowledgement window expired can still be checked in at the desk', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const guest = workshop.live.find(
      (p) => p.acknowledgementExpired && !p.checkedIn,
    )!;
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await deskCheckIn(volunteer, guest, { checked_in: true });

    expect(res.status).toBe(200);
    expect((await deskRowOf(volunteer, workshop, guest)).checked_in).toBe(true);
  });

  test('a volunteer scans a QR code and sees the name, event, status and CNIC to match at the door', async () => {
    const workshop = await givenEvent(backend, 'workshop', {
      named: ['محمد عثمان'],
    });
    const guest = workshop.person('محمد عثمان');
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await scanQr(volunteer, guest);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      registrationId: guest.registrationId,
      name: 'محمد عثمان',
      event: workshop.title,
      event_id: workshop.id,
      event_type_slug: 'workshop',
      status: 'confirmed',
      checkedIn: false,
      cnic: guest.cnic,
    });
  });

  test('a volunteer marks a scanned attendee as attended', async () => {
    const workshop = await givenEvent(backend, 'workshop');
    const [guest] = waitingAtTheDoor(workshop, 1);
    const volunteer = await backend.givenAdmin('volunteer');

    await markAttended(volunteer, guest);

    expect(await deskRowOf(volunteer, workshop, guest)).toMatchObject({
      status: 'attended',
      checked_in: true,
    });
  });

  test('scanning a QR code for a registration that does not exist says it was not found', async () => {
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await volunteer.post('/admin/qr-scan', {
      qr_data: JSON.stringify({
        registrationId: randomUUID(),
        name: 'Ghost Guest',
      }),
    });

    expect(res.status).toBe(404);
  });

  test('a volunteer checks a hackathon attendee in and they land on a team', async () => {
    const hackathon = await givenEvent(backend, 'hackathon');
    const [guest] = waitingAtTheDoor(hackathon, 1);
    const volunteer = await backend.givenAdmin('volunteer');

    await deskCheckIn(volunteer, guest, { checked_in: true });
    const res = await hackathonCheckIn(volunteer, guest);

    expect(res.status).toBe(201);
    expect(await teamNumberOf(volunteer, hackathon, guest)).toBe(
      res.body.team.team_number,
    );
  });

  test('checking the same hackathon attendee in twice keeps them on the same team', async () => {
    const hackathon = await givenEvent(backend, 'hackathon');
    const [guest] = waitingAtTheDoor(hackathon, 1);
    const volunteer = await backend.givenAdmin('volunteer');

    const first = await hackathonCheckIn(volunteer, guest);
    const second = await hackathonCheckIn(volunteer, guest);

    expect(second.body.team.id).toBe(first.body.team.id);
  });

  test('a volunteer can undo a hackathon check-in', async () => {
    const hackathon = await givenEvent(backend, 'hackathon');
    const [guest] = waitingAtTheDoor(hackathon, 1);
    const volunteer = await backend.givenAdmin('volunteer');
    await deskCheckIn(volunteer, guest, { checked_in: true });
    await hackathonCheckIn(volunteer, guest);

    const res = await undoHackathonCheckIn(volunteer, guest);

    expect(res.status).toBe(201);
    expect(await teamNumberOf(volunteer, hackathon, guest)).toBeNull();
    expect((await deskRowOf(volunteer, hackathon, guest)).checked_in).toBe(
      false,
    );
  });

  test('a volunteer sees every team of a hackathon with its members', async () => {
    const hackathon = await givenEvent(backend, 'hackathon');
    const [a, b, c, d, e, f] = waitingAtTheDoor(hackathon, 6);
    const chai = await givenTeam(backend, hackathon, [a, b, c, d], {
      selfRegistered: true,
    });
    const auto = await givenTeam(backend, hackathon, [e, f]);
    const volunteer = await backend.givenAdmin('volunteer');

    const res = await teamList(volunteer, hackathon);

    expect(res.status).toBe(200);
    expect(res.body.map((t: any) => [t.team_number, memberIdsOf(t)])).toEqual([
      [chai.teamNumber, idsOf(chai)],
      [auto.teamNumber, idsOf(auto)],
    ]);
  });
});

describe('check-in lists show only what the door needs', () => {
  const roles: Array<{ who: string; role: Role }> = [
    { who: 'a volunteer', role: 'volunteer' },
    { who: 'an organizer', role: 'organizer' },
    { who: 'a super admin', role: 'super_admin' },
  ];

  test.each(roles)(
    'the desk search shows $who no CNIC, phone number or motivation',
    async ({ role }) => {
      const workshop = await givenEvent(backend, 'workshop');
      const admin = await backend.givenAdmin(role);

      const res = await deskSearch(admin, workshop);

      expect(res.status).toBe(200);
      expect(privateDetailsFoundIn(res.body, workshop.people)).toEqual([]);
    },
  );

  async function teamListSeenBy(role: Role) {
    const hackathon = await givenEvent(backend, 'hackathon');
    const [a, b, c, d, e, f, g] = waitingAtTheDoor(hackathon, 7);
    await givenTeam(backend, hackathon, [a, b, c, d], {
      selfRegistered: true,
      deposit: 'submitted',
    });
    await givenTeam(backend, hackathon, [e, f, g]);
    const admin = await backend.givenAdmin(role);
    return { res: await teamList(admin, hackathon), people: hackathon.people };
  }

  test('the hackathon team list shows a volunteer no CNIC, phone number or motivation', async () => {
    const { res, people } = await teamListSeenBy('volunteer');

    expect(res.status).toBe(200);
    expect(privateDetailsFoundIn(res.body, people)).toEqual([]);
  });

  // The organizers' team view filters on phone and CNIC and opens full records from this list.
  test.each(roles.filter((r) => r.role !== 'volunteer'))(
    'the hackathon team list still gives $who the full member records',
    async ({ role }) => {
      const { res, people } = await teamListSeenBy(role);

      expect(res.status).toBe(200);
      expect(privateDetailsFoundIn(res.body, people)).not.toEqual([]);
    },
  );

  test('the desk search shows each attendee name, email, organisation, status and check-in state', async () => {
    const workshop = await givenEvent(backend, 'workshop', {
      named: ['Zoya Farooq'],
    });
    const guest = workshop.person('Zoya Farooq');
    const volunteer = await backend.givenAdmin('volunteer');

    const row = await deskRowOf(volunteer, workshop, guest);

    expect(row).toMatchObject({
      id: guest.registrationId,
      event_id: workshop.id,
      status: 'confirmed',
      checked_in: false,
      checked_in_at: null,
      acknowledged: true,
      acknowledgement_expired: false,
      attendee: {
        name: 'Zoya Farooq',
        email: guest.email,
        university_org: expect.any(String),
      },
    });
  });
});
