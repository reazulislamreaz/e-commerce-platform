import { ExecutionContext, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { USER_FACING } from '../messages/user-facing-errors';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const result = super.canActivate(context) as boolean | Promise<boolean>;
    if (!isPublic) return result;
    // Public routes still hydrate `req.user` when a Bearer token is present.
    return Promise.resolve(result).catch(() => true);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return (user ?? undefined) as TUser;
    if (err instanceof HttpException) throw err;
    if (err || !user) throw new UnauthorizedException(USER_FACING.PLEASE_LOG_IN);
    return user;
  }
}
