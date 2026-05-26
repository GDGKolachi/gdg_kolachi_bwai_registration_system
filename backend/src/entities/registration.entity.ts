import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Event } from './event.entity';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attendee_id: string;

  @Column()
  event_id: string;

  @Column('text', { nullable: true })
  motivation: string | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ default: false })
  checked_in: boolean;

  @CreateDateColumn()
  registered_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  checked_in_at: Date | null;

  @Column({ nullable: true })
  qr_code_data: string;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ type: 'varchar', nullable: true })
  domain: string | null;

  @Column({ type: 'varchar', nullable: true })
  track: string | null;

  @Column({ type: 'varchar', nullable: true })
  slot: string | null;

  @Column({ type: 'varchar', nullable: true })
  role_bucket: string | null;

  @Column('text', { nullable: true })
  ambassador: string | null;

  @ManyToOne(() => Attendee, (a) => a.registrations)
  @JoinColumn({ name: 'attendee_id' })
  attendee: Attendee;

  @ManyToOne(() => Event, (e) => e.registrations)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
