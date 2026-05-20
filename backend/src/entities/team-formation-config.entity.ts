import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity('team_formation_configs')
export class TeamFormationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_id: string;

  @Column({ type: 'int', default: 25 })
  max_teams: number;

  @Column({ type: 'int', default: 4 })
  max_team_size: number;

  @Column({ type: 'int', default: 2 })
  target_developers_per_team: number;

  @Column({ type: 'int', default: 1 })
  target_designers_per_team: number;

  @Column({ type: 'int', default: 1 })
  target_others_per_team: number;

  @Column({ type: 'int', default: 3 })
  soft_cap_developers_per_team: number;

  @Column({ type: 'int', default: 10 })
  domain_match_weight: number;

  @Column({ type: 'int', default: 6 })
  role_gap_weight: number;

  @Column({ type: 'int', default: 8 })
  role_overflow_penalty: number;

  @Column({ type: 'int', default: 2 })
  near_full_penalty: number;

  @Column({ default: 'hybrid' })
  assignment_mode: string;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Event, (e) => e.team_formation_config)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
