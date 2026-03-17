import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Workshop } from './workshop.entity';

@Entity('exception_requests')
export class ExceptionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attendee_id: string;

  @Column()
  requested_workshop_id: string;

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

  @ManyToOne(() => Workshop)
  @JoinColumn({ name: 'requested_workshop_id' })
  requested_workshop: Workshop;
}
