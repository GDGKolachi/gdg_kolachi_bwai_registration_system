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

  @Column({ default: 'upcoming' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Registration, (r) => r.workshop)
  registrations: Registration[];
}
