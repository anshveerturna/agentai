import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Inject } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from 'pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject('LOGGER') private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<any>();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const correlationId = request.correlationId;
    const userId = request.user?.id || request.user?.sub; // supabase token guard may set

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse();
            const status = res.statusCode;
            this.logger.info({
              method,
              url,
              status,
              durationMs: Date.now() - now,
              requestId: correlationId,
              userId: userId || null
            }, 'request_completed');
        },
        error: (err) => {
          this.logger.error({
            method,
            url,
            errorName: err?.name,
            errorMessage: err?.message,
            stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
            durationMs: Date.now() - now,
            requestId: correlationId,
            userId: userId || null
          }, 'request_error');
        }
      })
    );
  }
}
