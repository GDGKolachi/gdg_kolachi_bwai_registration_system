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

  @Column({ nullable: true })
  name: string | null;

  @Column({ nullable: true })
  primary_domain: string | null;

  @Column({ default: 'forming' })
  status: string;

  @Column({ nullable: true })
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
