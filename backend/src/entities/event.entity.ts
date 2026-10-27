import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Registration } from './registration.entity';
import { EventType } from './event-type.entity';
import { Team } from './team.entity';
import { TeamFormationConfig } from './team-formation-config.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_type_id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  date: string;

  @Column()
  time: string;

  @Column()
  venue: string;

  @Column({ type: 'int' })
  max_capacity: number;

  @Column({ nullable: true })
  map_location: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  speakers: { name: string; role: string; photo_url?: string }[];

  @Column({ type: 'text', nullable: true })
  special_instructions: string;

  @Column({ default: 'upcoming' })
  status: string;

  @Column({ type: 'boolean', default: true })
  allow_exceptions: boolean;

  @Column({ type: 'boolean', default: false })
  is_online: boolean;

  /**
   * Hackathon only. Off (default): attendees go straight to the individual
   * form. On: they choose between registering alone or as a team.
   */
  @Column({ type: 'boolean', default: false })
  allow_team_registration: boolean;

  @Column({ type: 'jsonb', nullable: true })
  tracks: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  slots: string[] | null;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgement_deadline: Date | null;

  @Column({ type: 'boolean', default: false })
  acknowledgement_locked: boolean;

  /** Google Cloud credits email (docs/cloud-credits.md). Nothing is sent unless enabled. */
  @Column({ type: 'boolean', default: false })
  credits_enabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  credits_claim_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  credits_video_url: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => EventType)
  @JoinColumn({ name: 'event_type_id' })
  event_type: EventType;

  @OneToMany(() => Registration, (r) => r.event)
  registrations: Registration[];

  @OneToMany(() => Team, (t) => t.event)
  teams: Team[];

  @OneToOne(() => TeamFormationConfig, (c) => c.event)
  team_formation_config: TeamFormationConfig;
}
