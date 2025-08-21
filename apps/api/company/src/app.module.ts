import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import pino from 'pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60, // 60 seconds
        limit: 100, // 100 requests per minute per IP default
      },
      {
        name: 'auth',
        ttl: 60,
        limit: 10, // Stricter bucket for auth-sensitive endpoints if used later
      },
    ]),
    AgentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  {
    provide: 'LOGGER',
    useFactory: () => {
      return pino({
        level: process.env.LOG_LEVEL || 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            '*.password',
            'refresh_token',
            'access_token'
          ],
          remove: true
        },
        formatters: {
          level(label) { return { level: label } }
        }
      })
    }
  },
  { provide: 'APP_INTERCEPTOR', useClass: LoggingInterceptor },
  { provide: 'APP_INTERCEPTOR', useClass: TimeoutInterceptor },
  { provide: 'APP_FILTER', useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
