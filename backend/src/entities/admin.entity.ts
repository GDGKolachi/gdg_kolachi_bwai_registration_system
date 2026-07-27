import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  name: string;

  /** 'super_admin' | 'organizer' | 'volunteer' — see AdminRole. */
  @Column({ default: 'organizer' })
  role: string;

  @CreateDateColumn()
  created_at: Date;
}
