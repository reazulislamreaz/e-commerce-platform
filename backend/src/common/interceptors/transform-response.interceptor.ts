import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<{ data: unknown }> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
