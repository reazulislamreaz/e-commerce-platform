import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';

/** Injects the JWT payload when present on a `@Public()` route; otherwise undefined. */
export const OptionalUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): JwtPayload | undefined =>
    context.switchToHttp().getRequest<{ user?: JwtPayload }>().user,
);
