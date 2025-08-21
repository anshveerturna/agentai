import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

// Adds/propagates a correlation ID for each request. Header: X-Request-Id
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, _res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.trim() !== '' ? incoming : randomUUID();
    req.correlationId = id;
    // Expose for downstream services / responses
    req.headers['x-request-id'] = id;
    next();
  }
}
