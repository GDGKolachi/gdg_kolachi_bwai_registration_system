import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Team } from './team.entity';
import { Registration } from './registration.entity';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  team_id: string;

  @Column()
  registration_id: string;

  @Column({ type: 'varchar', nullable: true })
  role_bucket_snapshot: string | null;

  @Column({ type: 'varchar', nullable: true })
  domain_snapshot: string | null;

  @Column({ default: false })
  is_anchor: boolean;

  @CreateDateColumn()
  assigned_at: Date;

  @Column({ default: 'auto' })
  assigned_by: string;

  @ManyToOne(() => Team, (t) => t.members)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Registration)
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;
}
