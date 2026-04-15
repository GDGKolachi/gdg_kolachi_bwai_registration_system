import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Registration } from './registration.entity';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Registration, (r) => r.workshop)
  registrations: Registration[];
}
