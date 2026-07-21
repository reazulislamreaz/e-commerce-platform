import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  toUserFacingMessage,
  toUserFacingValidationDetail,
  USER_FACING,
} from '../messages/user-facing-errors';

interface HttpErrorBody {
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = USER_FACING.INTERNAL;
    let error = 'Error';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = toUserFacingMessage(body, status);
        error = exception.name.replace(/Exception$/, '') || 'Error';
      } else {
        const { message: bodyMessage, error: bodyError } = body as HttpErrorBody;
        if (Array.isArray(bodyMessage)) {
          message = USER_FACING.VALIDATION;
          details = bodyMessage.map((item) => toUserFacingValidationDetail(String(item)));
        } else if (bodyMessage) {
          message = toUserFacingMessage(String(bodyMessage), status);
        } else {
          message = toUserFacingMessage(undefined, status);
        }
        // Keep a short non-technical label for API consumers; never leak class names.
        error = sanitizeErrorLabel(bodyError ?? exception.name, status);
      }
    } else {
      // Unknown errors are logged with full detail but never leaked to clients.
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      message = USER_FACING.INTERNAL;
      error = 'Error';
    }

    response.status(status).json({
      success: false,
      message,
      error,
      statusCode: status,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function sanitizeErrorLabel(raw: string, status: number): string {
  const cleaned = raw.replace(/Exception$/i, '').trim();
  if (!cleaned || /prisma|mongo|postgres|stack|econn/i.test(cleaned)) {
    if (status >= 500) return 'Error';
    if (status === 401) return 'Unauthorized';
    if (status === 403) return 'Forbidden';
    if (status === 404) return 'Not Found';
    if (status === 409) return 'Conflict';
    if (status === 429) return 'Too Many Requests';
    return 'Bad Request';
  }
  return cleaned;
}
