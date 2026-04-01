import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Workshop } from './workshop.entity';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attendee_id: string;

  @Column()
  workshop_id: string;

  @Column('text')
  motivation: string;

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

  /** User tapped "Confirm" in the shortlisted email (spot acknowledgement). */
  @Column({ default: false })
  acknowledged: boolean;

  @ManyToOne(() => Attendee, (a) => a.registrations)
  @JoinColumn({ name: 'attendee_id' })
  attendee: Attendee;

  @ManyToOne(() => Workshop, (w) => w.registrations)
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;
}
