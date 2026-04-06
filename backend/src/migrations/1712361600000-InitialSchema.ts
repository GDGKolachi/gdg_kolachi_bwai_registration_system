import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712361600000 implements MigrationInterface {
  name = 'InitialSchema1712361600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "name" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_admins_email" UNIQUE ("email"),
        CONSTRAINT "PK_admins" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "university_org" character varying NOT NULL,
        "github" character varying,
        "linkedin" character varying,
        "cnic" character varying NOT NULL,
        "gender" character varying,
        "defines_you_best" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_attendees_email" UNIQUE ("email"),
        CONSTRAINT "PK_attendees" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workshops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "date" character varying NOT NULL,
        "time" character varying NOT NULL,
        "venue" character varying NOT NULL,
        "max_capacity" integer NOT NULL,
        "map_location" character varying,
        "speakers" jsonb DEFAULT '[]',
        "status" character varying NOT NULL DEFAULT 'upcoming',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workshops" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "registrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "attendee_id" uuid NOT NULL,
        "workshop_id" uuid NOT NULL,
        "motivation" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "checked_in" boolean NOT NULL DEFAULT false,
        "registered_at" TIMESTAMP NOT NULL DEFAULT now(),
        "checked_in_at" TIMESTAMP,
        "qr_code_data" character varying,
        "acknowledged" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_registrations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_registrations_attendee" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_registrations_workshop" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exception_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "attendee_id" uuid NOT NULL,
        "requested_workshop_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "reviewed_by" character varying,
        "reviewed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exception_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exception_requests_attendee" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_exception_requests_workshop" FOREIGN KEY ("requested_workshop_id") REFERENCES "workshops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "exception_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "registrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workshops"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
  }
}
