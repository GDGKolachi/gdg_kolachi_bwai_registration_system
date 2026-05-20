import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('role_categories')
export class RoleCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  role_name: string;

  @Column()
  bucket: string;

  @Column({ type: 'int', default: 0 })
  weight: number;

  @Column({ default: true })
  is_active: boolean;
}
