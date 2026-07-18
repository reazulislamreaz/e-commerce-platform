import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiSuccessResponse {
  success: true;
  message: string;
  data: unknown;
  meta?: Record<string, unknown>;
}

/**
 * Services may return `{ data, meta, message }` to attach pagination meta or a
 * custom message; any other value is wrapped as `data` directly.
 */
interface EnvelopeHints {
  data: unknown;
  meta?: Record<string, unknown>;
  message?: string;
}

function hasEnvelopeShape(value: unknown): value is EnvelopeHints {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    ('meta' in value || 'message' in value)
  );
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse> {
    return next.handle().pipe(
      map((payload: unknown): ApiSuccessResponse => {
        if (hasEnvelopeShape(payload)) {
          return {
            success: true,
            message: payload.message ?? 'Success',
            data: payload.data,
            ...(payload.meta ? { meta: payload.meta } : {}),
          };
        }
        return { success: true, message: 'Success', data: payload ?? null };
      }),
    );
  }
}
