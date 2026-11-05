import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Global email settings as key/value rows. Today: `theme`. */
@Entity('email_settings')
export class EmailSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
