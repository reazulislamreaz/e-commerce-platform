import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@/generated/prisma/client';
import * as argon2 from 'argon2';
import { normalizeBdPhone } from '@/common/utils/bd-phone';
import { AuthService } from '@/modules/auth/auth.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateAdminDto } from './dto/create-admin.dto';
import type { ListUsersQueryDto } from './dto/list-users.query.dto';
import type { UpdateMeDto } from './dto/update-me.dto';
import { canAssignRole, canManage } from './role-policy';

const userSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * SUPER_ADMIN only (enforced at the controller). Admins are created ACTIVE
   * and pre-verified: the Super Admin vouches for the email address.
   */
  async createAdmin(dto: CreateAdminDto) {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          phone: normalizeBdPhone(dto.phone) as string,
          passwordHash: await argon2.hash(dto.password),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
        select: userSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        throw new ConflictException(
          target.includes('phone')
            ? 'Phone number is already registered'
            : 'Email is already registered',
        );
      }
      throw error;
    }
  }

  /** Profile of the signed-in user. JwtStrategy already rejects inactive accounts. */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Self-service profile update: names and phone only (email is immutable here). */
  async updateMe(userId: string, dto: UpdateMeDto) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          // DTO validation guarantees the format; normalization cannot fail here.
          ...(dto.phone !== undefined ? { phone: normalizeBdPhone(dto.phone) as string } : {}),
        },
        select: userSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Phone number is already registered');
      throw error;
    }
  }

  /** ADMIN sees customers only; SUPER_ADMIN sees everyone. */
  async list(actor: JwtPayload, query: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: actor.role === Role.SUPER_ADMIN ? query.role : Role.CUSTOMER,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { id: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return {
      data: page,
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? page[page.length - 1].id : null,
      },
    };
  }

  async getById(actor: JwtPayload, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    if (actor.role !== Role.SUPER_ADMIN && user.role !== Role.CUSTOMER)
      throw new ForbiddenException('You are not allowed to access this account');
    return user;
  }

  async updateStatus(actor: JwtPayload, id: string, status: UserStatus) {
    const target = await this.assertManageable(actor, id);
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { status },
      select: userSelect,
    });
    if (status === UserStatus.SUSPENDED) await this.auth.revokeAllUserSessions(target.id);
    return updated;
  }

  async updateRole(actor: JwtPayload, id: string, role: Role) {
    if (!canAssignRole(actor.role, role))
      throw new ForbiddenException('You are not allowed to assign this role');
    const target = await this.assertManageable(actor, id);
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { role },
      select: userSelect,
    });
    if (target.role !== role) {
      // Role changed: existing sessions carry stale privileges, so end them.
      await this.auth.revokeAllUserSessions(target.id);
    }
    return updated;
  }

  /** Soft delete. The email is anonymized so the address can register again. */
  async softDelete(actor: JwtPayload, id: string): Promise<void> {
    const target = await this.assertManageable(actor, id);
    await this.prisma.user.update({
      where: { id: target.id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.SUSPENDED,
        email: `deleted+${target.id}@deleted.invalid`,
      },
    });
    await this.auth.revokeAllUserSessions(target.id);
  }

  /**
   * Hierarchy gate for every mutation:
   * - no self-management (prevents self-suspension lockouts)
   * - ADMIN may only manage CUSTOMER accounts
   * - SUPER_ADMIN may manage ADMIN and CUSTOMER accounts, never other SUPER_ADMINs
   */
  private async assertManageable(actor: JwtPayload, targetId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, status: true, deletedAt: true },
    });
    if (!target || target.deletedAt) throw new NotFoundException('User not found');
    if (target.id === actor.sub)
      throw new ForbiddenException('You cannot manage your own account from this endpoint');
    if (!canManage(actor.role, target.role))
      throw new ForbiddenException('You are not allowed to manage this account');
    return target;
  }
}
