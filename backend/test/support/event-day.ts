import { randomInt, randomUUID } from 'node:crypto';
import { Backend, uniqueTag } from './backend';

export type EventSlug = 'workshop' | 'talks' | 'community-lounge' | 'hackathon';

export interface Person {
  registrationId: string;
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  status: string;
  checkedIn: boolean;
  deleted: boolean;
  acknowledgementExpired: boolean;
  qrCode: string;
}

export interface SeededEvent {
  id: string;
  title: string;
  slug: EventSlug;
  people: Person[];
  live: Person[];
  person: (name: string) => Person;
}

export interface SeededTeam {
  id: string;
  teamNumber: number;
  members: Person[];
}

const LATIN_NAMES = [
  'Ayesha Siddiqui',
  'Muhammad Ali',
  'Fatima Zahra',
  'Bilal Ahmed',
  'Hina Baig',
  'Zainab Qureshi',
  'Usman Tariq',
  'Sana Mirza',
  'Hamza Sheikh',
  'Mariam Khan',
  'Ali Raza',
  'Muhammad Ali',
];

const URDU_NAMES = [
  'عائشہ صدیقی',
  'محمد علی',
  'فاطمہ زہرا',
  'بلال احمد',
  'حنا بیگ',
  'زینب قریشی',
  'عثمان طارق',
  'ثناء مرزا',
];

const ORGS = [
  '',
  'NED University',
  'FAST-NUCES Karachi',
  'IBA Karachi',
  'Habib University',
];
const STATUSES = [
  'pending',
  'pending',
  'pending',
  'shortlisted',
  'shortlisted',
  'shortlisted',
  'confirmed',
  'confirmed',
  'attended',
  'rejected',
];
const DOMAINS = [
  'Service & Software Solutions',
  'Fintech & Digital Economy',
  'AI, Automation & Emerging Technologies',
  'Healthcare, EdTech & Skill Development',
];
const SKILLS = [
  'Frontend',
  'Backend',
  'AI/ML',
  'UI/UX Design',
  'Product/Business',
  'QA/Testing',
];
const DEFAULT_ROLES = [
  'Student',
  'Young Professional',
  'Intermediate Expert',
  'Freelancer',
];

function digits(count: number) {
  return Array.from({ length: count }, () => randomInt(10)).join('');
}

function emailFor(name: string, index: number, tag: string) {
  const latin = /^[A-Za-z ]+$/.test(name);
  const local = latin
    ? `${name.replace(/ /g, '.')}.${index}.${tag}`
    : `attendee.${index}.${tag}`;
  const domain = ['Example.com', 'example.com', 'EXAMPLE.COM'][index % 3];
  return `${index % 2 === 0 ? local : local.toLowerCase()}@${domain}`;
}

function placeholders(rows: number, columns: number) {
  return Array.from(
    { length: rows },
    (_, r) =>
      `(${Array.from({ length: columns }, (_, c) => `$${r * columns + c + 1}`).join(', ')})`,
  ).join(', ');
}

export async function eventTypeId(
  backend: Backend,
  slug: string,
): Promise<string> {
  const [row] = await backend.db.query<{ id: string }>(
    'SELECT id FROM event_types WHERE slug = $1',
    [slug],
  );
  return row.id;
}

export async function givenEvent(
  backend: Backend,
  slug: EventSlug,
  options: { crowd?: number; named?: string[]; title?: string } = {},
): Promise<SeededEvent> {
  const tag = uniqueTag();
  const crowd = options.crowd ?? 300;
  const named = options.named ?? [];
  const title =
    options.title ??
    {
      workshop: `Build with AI Workshop ${tag}`,
      talks: `Google I/O Extended Talks ${tag}`,
      'community-lounge': `Community Lounge ${tag}`,
      hackathon: `Build with AI Hackathon ${tag}`,
    }[slug];

  const [event] = await backend.db.query<{ id: string }>(
    `INSERT INTO events (event_type_id, title, description, date, time, venue, max_capacity, status)
     VALUES ($1, $2, $3, '2026-10-17', '10:00 AM', 'NIC Karachi', 500, 'upcoming') RETURNING id`,
    [await eventTypeId(backend, slug), title, `${title} at NIC Karachi`],
  );

  const people: Person[] = [];
  const attendeeRows: unknown[] = [];
  const registrationRows: unknown[] = [];
  const total = named.length + crowd;
  for (let i = 0; i < total; i++) {
    const isNamed = i < named.length;
    const name = isNamed
      ? named[i]
      : i % 3 === 0
        ? URDU_NAMES[i % URDU_NAMES.length]
        : LATIN_NAMES[i % LATIN_NAMES.length];
    const status = isNamed ? 'confirmed' : STATUSES[i % STATUSES.length];
    const deleted = !isNamed && i % 17 === 0;
    const person: Person = {
      registrationId: randomUUID(),
      attendeeId: randomUUID(),
      name,
      email: emailFor(name, i, tag),
      phone: `03${randomInt(10, 50)}-${digits(7)}`,
      cnic: `42101-${digits(7)}-${randomInt(10)}`,
      status,
      checkedIn: status === 'attended',
      deleted,
      acknowledgementExpired: status === 'shortlisted' && i % 11 === 0,
      qrCode: '',
    };
    person.qrCode = JSON.stringify({
      registrationId: person.registrationId,
      name: person.name,
      email: person.email,
      phone: person.phone,
      cnic: person.cnic,
    });
    people.push(person);

    attendeeRows.push(
      person.attendeeId,
      name,
      person.email,
      person.phone,
      ORGS[i % ORGS.length],
      i % 3 === 0
        ? null
        : i % 3 === 1
          ? ''
          : `https://github.com/dev${i}${tag}`,
      i % 4 === 0 ? null : `https://www.linkedin.com/in/member-${i}-${tag}`,
      person.cnic,
      i % 4 === 0 ? null : i % 2 === 0 ? 'Female' : 'Male',
      i % 7 === 0
        ? null
        : slug === 'hackathon'
          ? SKILLS[i % SKILLS.length]
          : DEFAULT_ROLES[i % 4],
    );
    registrationRows.push(
      person.registrationId,
      person.attendeeId,
      event.id,
      i % 5 === 0 ? null : MOTIVATION,
      status,
      person.checkedIn,
      person.checkedIn ? new Date() : null,
      ['shortlisted', 'confirmed', 'attended'].includes(status)
        ? person.qrCode
        : null,
      status === 'confirmed' || status === 'attended',
      slug === 'hackathon' && i % 6 !== 0 ? DOMAINS[i % DOMAINS.length] : null,
      deleted ? new Date() : null,
      person.acknowledgementExpired,
    );
  }

  await backend.db.query(
    `INSERT INTO attendees (id, name, email, phone, university_org, github, linkedin, cnic, gender, best_describes_you)
     VALUES ${placeholders(total, 10)}`,
    attendeeRows,
  );
  await backend.db.query(
    `INSERT INTO registrations (id, attendee_id, event_id, motivation, status, checked_in, checked_in_at,
       qr_code_data, acknowledged, domain, deleted_at, acknowledgement_expired)
     VALUES ${placeholders(total, 12)}`,
    registrationRows,
  );

  return {
    id: event.id,
    title,
    slug,
    people,
    live: people.filter((p) => !p.deleted),
    person: (wanted: string) => {
      const found = people.find((p) => p.name === wanted);
      if (!found) throw new Error(`No one called ${wanted} is registered`);
      return found;
    },
  };
}

export function waitingAtTheDoor(event: SeededEvent, count: number): Person[] {
  const waiting = event.live.filter(
    (p) => !p.checkedIn && ['shortlisted', 'confirmed'].includes(p.status),
  );
  return waiting.slice(0, count);
}

export async function givenTeam(
  backend: Backend,
  event: SeededEvent,
  members: Person[],
  options: {
    selfRegistered?: boolean;
    deposit?: 'not_requested' | 'requested' | 'submitted';
  } = {},
): Promise<SeededTeam> {
  const deposit = options.deposit ?? 'not_requested';
  const [team] = await backend.db.query<{ id: string; team_number: number }>(
    `INSERT INTO teams (event_id, team_number, name, primary_domain, status, origin,
       captain_registration_id, payment_status, payment_requested_at, payment_deadline,
       payment_submitted_at, payment_reference, payment_sender_name)
     SELECT $1, COALESCE(MAX(team_number), 0) + 1, $2, $3, 'forming', $4, $5, $6, $7, $8, $9, $10, $11
       FROM teams WHERE event_id = $1
     RETURNING id, team_number`,
    [
      event.id,
      options.selfRegistered ? `Team Chai ${uniqueTag()}` : null,
      DOMAINS[0],
      options.selfRegistered ? 'self_registered' : 'auto',
      options.selfRegistered ? members[0].registrationId : null,
      deposit,
      deposit === 'not_requested' ? null : new Date(),
      deposit === 'not_requested'
        ? null
        : new Date(Date.now() + 24 * 3600 * 1000),
      deposit === 'submitted' ? new Date() : null,
      deposit === 'submitted' ? `TXN-${uniqueTag().toUpperCase()}` : null,
      deposit === 'submitted' ? members[0].name : null,
    ],
  );
  for (const [index, member] of members.entries()) {
    await backend.db.query(
      `INSERT INTO team_members (team_id, registration_id, role_bucket_snapshot, domain_snapshot, is_anchor, assigned_by)
       VALUES ($1, $2, 'developer', $3, $4, $5)`,
      [
        team.id,
        member.registrationId,
        DOMAINS[0],
        index === 0,
        options.selfRegistered ? 'registration' : 'auto',
      ],
    );
    if (options.selfRegistered) {
      await backend.db.query(
        `UPDATE registrations SET registration_mode = 'team', is_captain = $2 WHERE id = $1`,
        [member.registrationId, index === 0],
      );
    }
  }
  return { id: team.id, teamNumber: team.team_number, members };
}

export const MOTIVATION =
  'I want to build something useful with AI for Karachi.';

export function privateDetailsFoundIn(
  body: unknown,
  people: Person[],
): string[] {
  const text = JSON.stringify(body ?? null);
  const secrets = [MOTIVATION, ...people.flatMap((p) => [p.phone, p.cnic])];
  return [...new Set(secrets.filter((value) => text.includes(value)))];
}

export function listOf(body: any): any[] {
  return Array.isArray(body) ? body : body?.data;
}
