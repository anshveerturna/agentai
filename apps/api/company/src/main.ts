// Load environment variables before anything else
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
const cookieParser = require('cookie-parser');

// Helper to resolve CORS origin flexibly (supports comma list, '*', fallback dev origin)
function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || '';
  if (raw === '*') return true;
  if (!raw.trim()) {
    return process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : false;
  }
  const list = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

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

  // Enable CORS for frontend-backend communication with resilient origin resolution
  const corsOrigin = resolveCorsOrigin();
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Company-Id',
      'Accept',
      'Origin',
      'Cookie',
    ],
    exposedHeaders: ['X-Request-Id'],
    optionsSuccessStatus: 204,
  });

  // Security headers via helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Allow APIs and same-origin; adjust if you add external resources
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"], // consider hashing scripts and removing unsafe-inline later
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'", process.env.FRONTEND_ORIGIN || ''],
          'frame-ancestors': ["'none'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hidePoweredBy: true,
      frameguard: { action: 'deny' },
    }),
  );

  // Remove Express X-Powered-By if still present
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Enable cookie parsing so guards/middleware can access cookies
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
