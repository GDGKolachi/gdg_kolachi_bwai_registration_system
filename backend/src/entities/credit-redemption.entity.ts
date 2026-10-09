import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Registration } from './registration.entity';
import { Event } from './event.entity';

export type CreditEmailStatus = 'not_sent' | 'pending' | 'sending' | 'sent' | 'failed';

/**
 * One row per registration: the credits email's send state plus the attendee's
 * self-reported redemption. UNIQUE(registration_id) is what makes queueing
 * idempotent. See docs/cloud-credits.md.
 */
@Entity('credit_redemptions')
export class CreditRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  registration_id: string;

  @Column({ type: 'uuid' })
  event_id: string;

  /** 32 random bytes, base64url. Used in attendee links instead of the registration id. */
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  /** `qr_scan` | `hackathon_scan` | `admin` | `volunteer_qr` */
  @Column({ type: 'varchar' })
  source: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_admin_id: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  email_status: CreditEmailStatus;

  @Column({ type: 'int', default: 0 })
  email_attempts: number;

  @Column({ type: 'int', default: 1 })
  email_generation: number;

  @Column({ type: 'timestamptz', nullable: true })
  email_next_attempt_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  email_queued_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  email_sent_at: Date | null;

  @Column({ type: 'text', nullable: true })
  email_last_error: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirm_page_opened_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  claim_clicked_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  video_clicked_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  redeemed_at: Date | null;

  /** `attendee` | `volunteer` */
  @Column({ type: 'varchar', nullable: true })
  redeemed_via: string | null;

  @Column({ type: 'uuid', nullable: true })
  redeemed_by_admin_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Registration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
