import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string; user?: any }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal Server Error' };

    const safeBody = typeof body === 'string' ? { message: body } : body;

    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      level: 'error',
      msg: 'unhandled_exception',
      status,
      method: request.method,
      url: request.originalUrl || request.url,
      requestId: request.correlationId,
      userId: request.user?.id || request.user?.sub || null,
      errorName: (exception as any)?.name,
      errorMessage: (exception as any)?.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : (exception as any)?.stack,
      time: new Date().toISOString()
    }));

    response.status(status).json(safeBody);
  }
}
