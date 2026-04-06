import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { SeedModule } from './seed/seed.module';
import { Admin } from './entities/admin.entity';
import { Workshop } from './entities/workshop.entity';
import { Attendee } from './entities/attendee.entity';
import { Registration } from './entities/registration.entity';
import { ExceptionRequest } from './entities/exception-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 30 },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
      port: process.env.DATABASE_URL ? undefined : Number(process.env.DB_PORT || 5432),
      username: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
      password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || 'admin'),
      database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'gdg_bwai'),
      entities: [Admin, Workshop, Attendee, Registration, ExceptionRequest],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
      synchronize: false,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    AuthModule,
    WorkshopsModule,
    RegistrationsModule,
    ExceptionsModule,
    AdminModule,
    EmailModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
