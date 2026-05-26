import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Event } from './event.entity';

@Entity('exception_requests')
export class ExceptionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attendee_id: string;

  @Column()
  requested_event_id: string;

  @Column('text')
  reason: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Attendee, (a) => a.exception_requests)
  @JoinColumn({ name: 'attendee_id' })
  attendee: Attendee;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'requested_event_id' })
  requested_event: Event;
}
