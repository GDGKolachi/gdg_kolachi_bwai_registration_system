import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Event } from './event.entity';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attendee_id: string;

  @Column()
  event_id: string;

  @Column('text', { nullable: true })
  motivation: string | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ default: false })
  checked_in: boolean;

  @CreateDateColumn()
  registered_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  checked_in_at: Date | null;

  @Column({ nullable: true })
  qr_code_data: string;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ type: 'varchar', nullable: true })
  domain: string | null;

  @Column({ type: 'varchar', nullable: true })
  track: string | null;

  @Column({ type: 'varchar', nullable: true })
  slot: string | null;

  @Column({ type: 'varchar', nullable: true })
  role_bucket: string | null;

  @Column({ type: 'boolean', default: false })
  acknowledgement_expired: boolean;

  @Column('text', { nullable: true })
  ambassador: string | null;

  /** 'individual' when self-registered alone, 'team' when part of a captain-submitted team. */
  @Column({ default: 'individual' })
  registration_mode: string;

  /** True for the one member who submitted a team registration. */
  @Column({ default: false })
  is_captain: boolean;

  // Hackathon shortlisting answers. Nullable throughout — non-captain team
  // members answer the light set (skills only).
  @Column({ type: 'varchar', nullable: true })
  years_experience: string | null;

  @Column({ type: 'varchar', nullable: true })
  prior_hackathons: string | null;

  @Column({ type: 'jsonb', nullable: true })
  skills: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  ai_experience: string | null;

  @Column({ type: 'varchar', nullable: true })
  portfolio_url: string | null;

  @Column({ type: 'text', nullable: true })
  best_project: string | null;

  /**
   * Soft delete. A deleted registration is hidden from lists, stats, CSV export
   * and check-in, frees its seat back to capacity, and stops blocking that
   * email from registering again — but the row is never destroyed.
   */
  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string | null;

  @ManyToOne(() => Attendee, (a) => a.registrations)
  @JoinColumn({ name: 'attendee_id' })
  attendee: Attendee;

  @ManyToOne(() => Event, (e) => e.registrations)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
