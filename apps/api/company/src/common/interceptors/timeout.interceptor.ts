import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

interface CircuitState { failures: number; lastFailure: number; openUntil?: number }
const circuits = new Map<string, CircuitState>()

const FAILURE_THRESHOLD = 5
const COOL_DOWN_MS = 30_000
const REQUEST_TIMEOUT_MS = 5_000

function keyFor(ctx: ExecutionContext) {
  const req = ctx.switchToHttp().getRequest<any>()
  return req?.route?.path || req?.originalUrl || 'global'
}

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const key = keyFor(context)
    const state = circuits.get(key)
    const now = Date.now()
    if (state?.openUntil && now < state.openUntil) {
      return throwError(() => new ServiceUnavailableException('Service temporarily unavailable'))
    }
    return next.handle().pipe(
      timeout({ each: REQUEST_TIMEOUT_MS }),
      catchError(err => {
        if (err instanceof TimeoutError) {
          const cur = circuits.get(key) || { failures: 0, lastFailure: 0 }
          cur.failures += 1
          cur.lastFailure = now
          if (cur.failures >= FAILURE_THRESHOLD) cur.openUntil = now + COOL_DOWN_MS
          circuits.set(key, cur)
          return throwError(() => new RequestTimeoutException())
        }
        const cur = circuits.get(key) || { failures: 0, lastFailure: 0 }
        cur.failures += 1
        cur.lastFailure = now
        if (cur.failures >= FAILURE_THRESHOLD) cur.openUntil = now + COOL_DOWN_MS
        circuits.set(key, cur)
        return throwError(() => err)
      })
    )
  }
}
