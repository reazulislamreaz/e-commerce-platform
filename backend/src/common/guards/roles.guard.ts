import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@/generated/prisma/client';
import { USER_FACING } from '../messages/user-facing-errors';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const { user } = context.switchToHttp().getRequest<{ user?: { role: Role } }>();
    if (!user) throw new ForbiddenException(USER_FACING.PLEASE_LOG_IN);
    // SUPER_ADMIN has unrestricted access to every role-gated route.
    if (user.role === Role.SUPER_ADMIN) return true;
    if (!roles.includes(user.role)) {
      throw new ForbiddenException(USER_FACING.NO_PERMISSION);
    }
    return true;
  }
}
