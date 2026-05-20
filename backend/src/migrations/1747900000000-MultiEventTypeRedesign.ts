import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiEventTypeRedesign1747900000000 implements MigrationInterface {
  name = 'MultiEventTypeRedesign1747900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. event_types table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_event_types_name" UNIQUE ("name"),
        CONSTRAINT "UQ_event_types_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_event_types" PRIMARY KEY ("id")
      )
    `);

    // 2. Seed the 4 core event types
    await queryRunner.query(`
      INSERT INTO "event_types" ("name", "slug", "description")
      VALUES
        ('Workshop', 'workshop', 'Hands-on learning session'),
        ('Talks', 'talks', 'Speaker-led talk session'),
        ('Community Lounge', 'community-lounge', 'Casual track + slot networking session'),
        ('Hackathon', 'hackathon', 'Team-based building competition')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // 3. Rename workshops -> events
    await queryRunner.query(`ALTER TABLE "workshops" RENAME TO "events"`);
    await queryRunner.query(`ALTER TABLE "events" RENAME CONSTRAINT "PK_workshops" TO "PK_events"`);

    // 4. events: add event_type_id (backfill -> Workshop), tracks, slots
    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN "event_type_id" uuid`);
    await queryRunner.query(`
      UPDATE "events" SET "event_type_id" =
        (SELECT "id" FROM "event_types" WHERE "slug" = 'workshop')
    `);
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "event_type_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD CONSTRAINT "FK_events_event_type"
      FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN "tracks" jsonb`);
    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN "slots" jsonb`);

    // 5. registrations: rename workshop_id -> event_id, add hackathon/community-lounge fields
    await queryRunner.query(`ALTER TABLE "registrations" RENAME COLUMN "workshop_id" TO "event_id"`);
    await queryRunner.query(
      `ALTER TABLE "registrations" RENAME CONSTRAINT "FK_registrations_workshop" TO "FK_registrations_event"`,
    );
    await queryRunner.query(`ALTER TABLE "registrations" ADD COLUMN "domain" character varying`);
    await queryRunner.query(`ALTER TABLE "registrations" ADD COLUMN "track" character varying`);
    await queryRunner.query(`ALTER TABLE "registrations" ADD COLUMN "slot" character varying`);
    await queryRunner.query(`ALTER TABLE "registrations" ADD COLUMN "role_bucket" character varying`);

    // 6. exception_requests: rename requested_workshop_id -> requested_event_id
    await queryRunner.query(
      `ALTER TABLE "exception_requests" RENAME COLUMN "requested_workshop_id" TO "requested_event_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exception_requests" RENAME CONSTRAINT "FK_exception_requests_workshop" TO "FK_exception_requests_event"`,
    );

    // 7. attendees: rename defines_you_best -> best_describes_you
    await queryRunner.query(
      `ALTER TABLE "attendees" RENAME COLUMN "defines_you_best" TO "best_describes_you"`,
    );

    // 8. role_categories: admin-editable role -> bucket mapping for hackathon team formation
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role_name" character varying NOT NULL,
        "bucket" character varying NOT NULL,
        "weight" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_role_categories_role_name" UNIQUE ("role_name"),
        CONSTRAINT "PK_role_categories" PRIMARY KEY ("id")
      )
    `);

    // 9. Seed the 15 hackathon roles -> bucket mapping
    await queryRunner.query(`
      INSERT INTO "role_categories" ("role_name", "bucket") VALUES
        ('Student', 'student'),
        ('Web Developer', 'developer'),
        ('Mobile App Developer', 'developer'),
        ('Software Developer', 'developer'),
        ('Full Stack Developer', 'developer'),
        ('Game Developer', 'developer'),
        ('Other Developer', 'developer'),
        ('UI/UX Designer', 'designer'),
        ('Product Designer', 'product_designer'),
        ('Game Designer', 'designer'),
        ('Other Designer', 'designer'),
        ('SQA Engineer/Tester', 'qa'),
        ('Software Sales Executive', 'sales'),
        ('Freelancer', 'freelancer'),
        ('Others', 'other')
      ON CONFLICT ("role_name") DO NOTHING
    `);

    // 10. team_formation_configs: one per hackathon event
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_formation_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "max_teams" integer NOT NULL DEFAULT 25,
        "max_team_size" integer NOT NULL DEFAULT 4,
        "target_developers_per_team" integer NOT NULL DEFAULT 2,
        "target_designers_per_team" integer NOT NULL DEFAULT 1,
        "target_others_per_team" integer NOT NULL DEFAULT 1,
        "soft_cap_developers_per_team" integer NOT NULL DEFAULT 3,
        "domain_match_weight" integer NOT NULL DEFAULT 10,
        "role_gap_weight" integer NOT NULL DEFAULT 6,
        "role_overflow_penalty" integer NOT NULL DEFAULT 8,
        "near_full_penalty" integer NOT NULL DEFAULT 2,
        "assignment_mode" character varying NOT NULL DEFAULT 'hybrid',
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_team_formation_configs_event" UNIQUE ("event_id"),
        CONSTRAINT "PK_team_formation_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_formation_configs_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 11. teams: hackathon teams scoped to an event
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "team_number" integer NOT NULL,
        "name" character varying,
        "primary_domain" character varying,
        "status" character varying NOT NULL DEFAULT 'forming',
        "created_by" uuid,
        "formed_at" TIMESTAMP NOT NULL DEFAULT now(),
        "locked_at" TIMESTAMP,
        CONSTRAINT "UQ_teams_event_number" UNIQUE ("event_id", "team_number"),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teams_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_teams_created_by" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // 12. team_members: one registration -> one team
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL,
        "registration_id" uuid NOT NULL,
        "role_bucket_snapshot" character varying,
        "domain_snapshot" character varying,
        "is_anchor" boolean NOT NULL DEFAULT false,
        "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
        "assigned_by" character varying NOT NULL DEFAULT 'auto',
        CONSTRAINT "UQ_team_members_registration" UNIQUE ("registration_id"),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_members_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_team_members_registration" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "team_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team_formation_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_categories"`);

    await queryRunner.query(
      `ALTER TABLE "attendees" RENAME COLUMN "best_describes_you" TO "defines_you_best"`,
    );

    await queryRunner.query(
      `ALTER TABLE "exception_requests" RENAME CONSTRAINT "FK_exception_requests_event" TO "FK_exception_requests_workshop"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exception_requests" RENAME COLUMN "requested_event_id" TO "requested_workshop_id"`,
    );

    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "role_bucket"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "slot"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "track"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "domain"`);
    await queryRunner.query(
      `ALTER TABLE "registrations" RENAME CONSTRAINT "FK_registrations_event" TO "FK_registrations_workshop"`,
    );
    await queryRunner.query(`ALTER TABLE "registrations" RENAME COLUMN "event_id" TO "workshop_id"`);

    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "slots"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "tracks"`);
    await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_events_event_type"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "event_type_id"`);
    await queryRunner.query(`ALTER TABLE "events" RENAME CONSTRAINT "PK_events" TO "PK_workshops"`);
    await queryRunner.query(`ALTER TABLE "events" RENAME TO "workshops"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "event_types"`);
  }
}
