import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { Admin } from './admin.entity';
import { TeamMember } from './team-member.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_id: string;

  @Column({ type: 'int' })
  team_number: number;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  primary_domain: string | null;

  @Column({ default: 'forming' })
  status: string;

  /**
   * 'auto'            — built by the check-in assignment engine.
   * 'self_registered' — submitted whole by a captain at registration time.
   */
  @Column({ default: 'auto' })
  origin: string;

  @Column({ type: 'uuid', nullable: true })
  captain_registration_id: string | null;

  // Team-level registration answers (self-registered teams only).
  @Column({ type: 'boolean', default: false })
  has_idea: boolean;

  @Column({ type: 'text', nullable: true })
  idea_description: string | null;

  @Column({ type: 'varchar', nullable: true })
  worked_together_before: string | null;

  // ── Deposit confirmation ───────────────────────────────────────────────
  // One deposit per team, so it lives here rather than on each registration.
  // 'expired' is never stored — it is derived from 'requested' + a passed
  // deadline, so extending a deadline un-expires a team with no extra write.
  @Column({ default: 'not_requested' })
  payment_status: 'not_requested' | 'requested' | 'submitted' | 'paid' | 'rejected';

  @Column({ type: 'timestamptz', nullable: true })
  payment_requested_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  payment_deadline: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  payment_submitted_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  payment_reference: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_sender_name: string | null;

  @Column({ type: 'text', nullable: true })
  payment_note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  payment_confirmed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  payment_confirmed_by: string | null;

  @Column({ type: 'text', nullable: true })
  payment_rejection_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  formed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  locked_at: Date | null;

  @ManyToOne(() => Event, (e) => e.teams)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'created_by' })
  creator: Admin | null;

  @OneToMany(() => TeamMember, (m) => m.team)
  members: TeamMember[];
}
