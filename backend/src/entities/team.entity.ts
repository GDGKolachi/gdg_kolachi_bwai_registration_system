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
