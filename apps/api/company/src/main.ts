import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy if behind one (e.g., reverse proxy / load balancer)
  if (process.env.TRUST_PROXY === 'true') {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance?.();
    if (instance && typeof instance.set === 'function') {
      instance.set('trust proxy', true);
    }
  }

  // Body size limits (JSON & urlencoded)
  const bodyLimit = process.env.BODY_LIMIT || '1mb';
  // @ts-ignore types for express json imported namespace
  app.use(express.json({ limit: bodyLimit }));
  // @ts-ignore
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

  // Enable CORS for frontend-backend communication (tighten later if needed)
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  });

  // Security headers via helmet
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Allow APIs and same-origin; adjust if you add external resources
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"], // consider hashing scripts and removing unsafe-inline later
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", 'data:', 'https:'],
        "connect-src": ["'self'", process.env.FRONTEND_ORIGIN || ''],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hidePoweredBy: true,
    frameguard: { action: 'deny' }
  }));

  // Remove Express X-Powered-By if still present
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
