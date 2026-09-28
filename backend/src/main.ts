import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  // Guard: fail fast if JWT_SECRET is missing or left as an insecure default.
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'changeme-secret' || jwtSecret.startsWith('replace_me')) {
    console.error(
      '❌  FATAL: JWT_SECRET is not set or is using an insecure placeholder.\n' +
      '   Set a strong, unique JWT_SECRET environment variable before starting the server.\n' +
      '   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // ── Security headers (Helmet) ─────────────────────────────────────────────
  app.use(helmet());

  // ── Input validation — globally applied to every controller ──────────────
  // whitelist: strips any properties not declared in the DTO.
  // forbidNonWhitelisted: throws 400 if unknown properties are sent.
  // transform: converts plain body objects into DTO class instances.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  // FRONTEND_URL can be a comma-separated list for multiple origins:
  // e.g. "http://localhost:5173,https://codego-platform.netlify.app"
  const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 CodeGoAI backend running on port ${port}`);
}
bootstrap();
