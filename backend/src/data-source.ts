import { DataSource } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { Workshop } from './entities/workshop.entity';
import { Attendee } from './entities/attendee.entity';
import { Registration } from './entities/registration.entity';
import { ExceptionRequest } from './entities/exception-request.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  port: process.env.DATABASE_URL ? undefined : Number(process.env.DB_PORT || 5432),
  username: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || 'admin'),
  database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'gdg_bwai'),
  entities: [Admin, Workshop, Attendee, Registration, ExceptionRequest],
  migrations: ['src/migrations/*{.ts,.js}'],
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});
