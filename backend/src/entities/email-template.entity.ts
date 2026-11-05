import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Admin overrides for one email type's copy. A null field (or no row at all)
 * means the built-in default from src/email/templates/email-types.ts.
 */
@Entity('email_templates')
export class EmailTemplate {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  email_type: string;

  @Column({ type: 'text', nullable: true })
  subject: string | null;

  @Column({ type: 'text', nullable: true })
  heading: string | null;

  @Column({ type: 'text', nullable: true })
  intro: string | null;

  @Column({ type: 'text', nullable: true })
  cta_label: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
