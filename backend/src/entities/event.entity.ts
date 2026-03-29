import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { EventType } from '../common/enums/event-type.enum';
import { Workshop } from './workshop.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'upcoming' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Workshop, (w) => w.event)
  workshops: Workshop[];
}
