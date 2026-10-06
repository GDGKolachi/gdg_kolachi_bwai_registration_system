import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config as loadEnv } from 'dotenv';
loadEnv();

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required. Refusing to start with default secret.');
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // nginx is the one proxy in front and appends the client's address to
  // X-Forwarded-For; trusting exactly that hop makes req.ip the visitor, so rate
  // limits are per visitor instead of one bucket for everyone. Revisit if
  // another proxy (e.g. Cloudflare) is ever put in front of nginx.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS Policy
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Swagger UI
  const config = new DocumentBuilder()
    .setTitle('GDG Kolachi - Build with AI Registration API')
    .setDescription('API for workshop registration, admin management, QR check-in, and user management')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
