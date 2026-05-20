import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Registration } from './registration.entity';
import { ExceptionRequest } from './exception-request.entity';

@Entity('attendees')
export class Attendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  university_org: string;

  @Column({ nullable: true })
  github: string;

  @Column({ nullable: true })
  linkedin: string;

  @Column()
  cnic: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  best_describes_you: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Registration, (r) => r.attendee)
  registrations: Registration[];

  @OneToMany(() => ExceptionRequest, (e) => e.attendee)
  exception_requests: ExceptionRequest[];
}
