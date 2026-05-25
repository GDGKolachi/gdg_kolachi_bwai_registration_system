import 'dotenv/config';
import dataSource from '../data-source';
import { EventType } from '../entities/event-type.entity';
import { Event } from '../entities/event.entity';
import { Attendee } from '../entities/attendee.entity';
import { Registration } from '../entities/registration.entity';
import { RoleCategory } from '../entities/role-category.entity';

const SEED_TAG = '__seed_team_test__';

const DOMAIN_A = 'Service & Software Solutions';
const DOMAIN_B = 'AI, Automation & Emerging Technologies';

// Role spread designed for targets dev=2 / designer=1 / other=1 (max size 4).
// Domain A: 4 dev + 2 designers + 2 others -> 2 complete teams.
// Domain B: 2 dev + 1 designer + 1 other   -> 1 complete team.
const TEST_PEOPLE: Array<{ name: string; role: string; domain: string }> = [
  { name: 'Ali Dev', role: 'Web Developer', domain: DOMAIN_A },
  { name: 'Bilal Stack', role: 'Full Stack Developer', domain: DOMAIN_A },
  { name: 'Sara Code', role: 'Software Developer', domain: DOMAIN_A },
  { name: 'Hina Mobile', role: 'Mobile App Developer', domain: DOMAIN_A },
  { name: 'Zara UX', role: 'UI/UX Designer', domain: DOMAIN_A },
  { name: 'Omar Product', role: 'Product Designer', domain: DOMAIN_A },
  { name: 'Ahmed Student', role: 'Student', domain: DOMAIN_A },
  { name: 'Fatima Growth', role: 'Product and Marketing', domain: DOMAIN_A },

  { name: 'Usman AI', role: 'Web Developer', domain: DOMAIN_B },
  { name: 'Ayesha ML', role: 'Game Developer', domain: DOMAIN_B },
  { name: 'Noor Design', role: 'UI/UX Designer', domain: DOMAIN_B },
  { name: 'Kamran Misc', role: 'Others', domain: DOMAIN_B },
];

function pad(n: number, width: number) {
  return String(n).padStart(width, '0');
}

async function run() {
  await dataSource.initialize();
  const eventTypeRepo = dataSource.getRepository(EventType);
  const eventRepo = dataSource.getRepository(Event);
  const attendeeRepo = dataSource.getRepository(Attendee);
  const regRepo = dataSource.getRepository(Registration);
  const roleRepo = dataSource.getRepository(RoleCategory);

  const hackType = await eventTypeRepo.findOne({ where: { slug: 'hackathon' } });
  if (!hackType) {
    throw new Error('Hackathon event type not found. Start the app once so the seed service runs.');
  }

  // Find an existing hackathon event, otherwise create a test one.
  let event = await eventRepo.findOne({
    where: { event_type_id: hackType.id },
    order: { created_at: 'DESC' },
  });
  if (!event) {
    event = await eventRepo.save(
      eventRepo.create({
        event_type_id: hackType.id,
        title: 'Test Hackathon (seeded)',
        description: 'Seeded hackathon for team-formation testing.',
        date: '2026-06-15',
        time: '09:00',
        venue: 'GDG Kolachi HQ',
        max_capacity: 200,
        status: 'open',
        allow_exceptions: true,
      }),
    );
    console.log(`Created test hackathon event: ${event.title} (${event.id})`);
  } else {
    console.log(`Using existing hackathon event: ${event.title} (${event.id})`);
  }

  // Idempotency: skip if this event was already seeded.
  const already = await regRepo.count({ where: { event_id: event.id, ambassador: SEED_TAG } });
  if (already > 0) {
    console.log(`Already seeded (${already} test registrations exist for this event). Nothing to do.`);
    await dataSource.destroy();
    return;
  }

  // Build role -> bucket map from role_categories.
  const roleCats = await roleRepo.find();
  const bucketFor = (roleName: string) =>
    roleCats.find((c) => c.role_name === roleName)?.bucket || 'other';

  let i = 0;
  for (const person of TEST_PEOPLE) {
    i++;
    const email = `teamtest${i}@gdg.test`;
    let attendee = await attendeeRepo.findOne({ where: { email } });
    if (!attendee) {
      attendee = await attendeeRepo.save(
        attendeeRepo.create({
          name: person.name,
          email,
          phone: `0312-${pad(1000000 + i, 7)}`,
          university_org: 'Test University',
          linkedin: `https://linkedin.com/in/teamtest${i}`,
          cnic: `42101-${pad(1000000 + i, 7)}-1`,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          best_describes_you: person.role,
        }),
      );
    }

    await regRepo.save(
      regRepo.create({
        attendee_id: attendee.id,
        event_id: event.id,
        motivation: 'Seeded test participant for team formation.',
        status: 'shortlisted',
        checked_in: false,
        domain: person.domain,
        role_bucket: bucketFor(person.role),
        ambassador: SEED_TAG,
      }),
    );
    console.log(`  + ${person.name} — ${person.role} [${bucketFor(person.role)}] @ ${person.domain}`);
  }

  console.log(`\nSeeded ${TEST_PEOPLE.length} shortlisted registrations on event ${event.id}.`);
  console.log('Go to Admin → Hackathon Check-in for this event and check people in to watch teams form.');
  console.log('Expected with default targets (2 dev / 1 designer / 1 other, max 4): 3 teams total.');

  await dataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
