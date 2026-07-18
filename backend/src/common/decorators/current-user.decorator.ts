import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';

/** Injects the authenticated JWT payload attached by JwtStrategy. */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest<{ user: JwtPayload }>().user,
);
