import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@/generated/prisma/client';
import * as argon2 from 'argon2';
import { normalizeBdPhone } from '@/common/utils/bd-phone';
import { poishaToTaka } from '@/common/utils/money';
import { uniqueConflictIncludes } from '@/common/utils/prisma-unique-conflict';
import { USER_FACING } from '@/common/messages/user-facing-errors';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthUserCacheService } from '@/modules/auth/auth-user-cache.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { AuditService } from '@/modules/platform/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BulkUserAction, type BulkUsersDto } from './dto/bulk-users.dto';
import type { CreateAdminDto } from './dto/create-admin.dto';
import { UserListSort, type ListUsersQueryDto } from './dto/list-users.query.dto';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { canAssignRole, canManage } from './role-policy';

const EMAIL_ALREADY_REGISTERED = USER_FACING.EMAIL_ALREADY_REGISTERED;
const PHONE_ALREADY_REGISTERED = USER_FACING.PHONE_ALREADY_REGISTERED;

const userSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  emailVerifiedAt: true,
  adminNotes: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  customerMetric: {
    select: {
      orderCount: true,
      lifetimeValuePoisha: true,
    },
  },
  sessions: {
    select: { lastSeenAt: true, createdAt: true },
    orderBy: { lastSeenAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly userCache: AuthUserCacheService,
    private readonly audit: AuditService,
  ) {}

  /**
   * SUPER_ADMIN only (enforced at the controller). Admins are created ACTIVE
   * and pre-verified: the Super Admin vouches for the email address.
   */
  async createAdmin(actor: JwtPayload, dto: CreateAdminDto) {
    try {
      const created = await this.prisma.user.create({
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
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'user.admin_created',
        resourceType: 'user',
        resourceId: created.id,
        after: { email: created.email, role: created.role },
      });
      return this.toListItem(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          uniqueConflictIncludes(error, 'phone')
            ? PHONE_ALREADY_REGISTERED
            : EMAIL_ALREADY_REGISTERED,
        );
      }
      throw error;
    }
  }

  /** Profile of the signed-in user. JwtStrategy already rejects inactive accounts. */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return this.toListItem(user);
  }

  /** Self-service profile update: names and phone only (email is immutable here). */
  async updateMe(userId: string, dto: UpdateMeDto) {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          ...(dto.phone !== undefined ? { phone: normalizeBdPhone(dto.phone) as string } : {}),
        },
        select: userSelect,
      });
      return this.toListItem(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException(PHONE_ALREADY_REGISTERED);
      throw error;
    }
  }

  /**
   * Offset-paginated admin directory. ADMIN sees customers only;
   * SUPER_ADMIN may filter by any role (staff = ADMIN, users = CUSTOMER).
   */
  async list(actor: JwtPayload, query: ListUsersQueryDto) {
    const pageSize = query.limit ?? query.pageSize ?? query.size ?? 20;
    const page = query.page;
    const where = this.buildListWhere(actor, query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: this.buildOrderBy(query.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      data: rows.map((row) => this.toListItem(row)),
      meta: {
        page,
        pageSize,
        limit: pageSize,
        total,
        totalPages,
        nextCursor: null,
      },
    };
  }

  async getById(actor: JwtPayload, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanRead(actor, user.role);
    return this.toListItem(user);
  }

  async getDetail(actor: JwtPayload, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        addresses: {
          where: { deletedAt: null },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            label: true,
            fullName: true,
            phone: true,
            line1: true,
            line2: true,
            city: true,
            district: true,
            postalCode: true,
            country: true,
            type: true,
            isDefault: true,
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            number: true,
            status: true,
            totalPoisha: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        },
        wishlist: {
          select: {
            items: {
              orderBy: { createdAt: 'desc' },
              take: 50,
              select: {
                productId: true,
                createdAt: true,
              },
            },
          },
        },
        productReviews: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            rating: true,
            title: true,
            status: true,
            createdAt: true,
            product: { select: { id: true, name: true, slug: true } },
          },
        },
        activityEvents: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: {
            id: true,
            eventType: true,
            title: true,
            href: true,
            createdAt: true,
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            ip: true,
            userAgent: true,
            rememberMe: true,
            createdAt: true,
            lastSeenAt: true,
            expiresAt: true,
            revokedAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanRead(actor, user.role);

    const auditTrail = await this.prisma.auditLog.findMany({
      where: {
        OR: [{ resourceType: 'user', resourceId: id }, { actorUserId: id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        actorUserId: true,
        actorRole: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const base = this.toListItem(user);
    const addresses = user.addresses.map((address) => ({
      ...address,
      type: address.type as 'SHIPPING' | 'BILLING',
    }));

    const wishlistItems = user.wishlist?.items ?? [];
    const wishlistProducts = wishlistItems.length
      ? await this.prisma.product.findMany({
          where: { id: { in: wishlistItems.map((item) => item.productId) } },
          select: {
            id: true,
            name: true,
            slug: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        })
      : [];
    const productById = new Map(wishlistProducts.map((product) => [product.id, product]));

    return {
      ...base,
      shippingAddresses: addresses.filter((address) => address.type === 'SHIPPING'),
      billingAddresses: addresses.filter((address) => address.type === 'BILLING'),
      orders: user.orders.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        itemCount: order._count.items,
        total: poishaToTaka(order.totalPoisha),
        createdAt: order.createdAt,
      })),
      wishlist: wishlistItems.flatMap((item) => {
        const product = productById.get(item.productId);
        if (!product) return [];
        return [
          {
            productId: product.id,
            name: product.name,
            slug: product.slug,
            imageUrl: product.media[0]?.url,
            addedAt: item.createdAt,
          },
        ];
      }),
      reviews: user.productReviews.map((review) => ({
        id: review.id,
        productId: review.product.id,
        productName: review.product.name,
        productSlug: review.product.slug,
        rating: review.rating,
        title: review.title,
        status: review.status,
        createdAt: review.createdAt,
      })),
      activity: user.activityEvents.map((event) => ({
        id: event.id.toString(),
        eventType: event.eventType,
        title: event.title,
        href: event.href ?? undefined,
        createdAt: event.createdAt,
      })),
      loginHistory: user.sessions.map((session) => ({
        id: session.id,
        ip: session.ip,
        userAgent: session.userAgent,
        rememberMe: session.rememberMe,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        active: !session.revokedAt && session.expiresAt > now,
      })),
      auditTrail: auditTrail.map((entry) => ({
        id: entry.id.toString(),
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole,
        createdAt: entry.createdAt,
      })),
    };
  }

  async updateProfile(actor: JwtPayload, id: string, dto: UpdateUserDto) {
    const target = await this.assertManageable(actor, id, { allowDeleted: false });
    try {
      const updated = await this.prisma.user.update({
        where: { id: target.id },
        data: {
          ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: normalizeBdPhone(dto.phone) as string } : {}),
        },
        select: userSelect,
      });
      await this.userCache.invalidate(target.id);
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'user.profile_updated',
        resourceType: 'user',
        resourceId: target.id,
        after: dto,
      });
      return this.toListItem(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException(PHONE_ALREADY_REGISTERED);
      throw error;
    }
  }

  async updateNotes(actor: JwtPayload, id: string, notes: string) {
    const target = await this.assertManageable(actor, id, { allowDeleted: true });
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { adminNotes: notes.trim() || null },
      select: userSelect,
    });
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'user.notes_updated',
      resourceType: 'user',
      resourceId: target.id,
    });
    return this.toListItem(updated);
  }

  async updateStatus(actor: JwtPayload, id: string, status: UserStatus) {
    const target = await this.assertManageable(actor, id);
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { status },
      select: userSelect,
    });
    await this.userCache.invalidate(target.id);
    if (status === UserStatus.SUSPENDED) await this.auth.revokeAllUserSessions(target.id);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: status === UserStatus.SUSPENDED ? 'user.suspended' : 'user.activated',
      resourceType: 'user',
      resourceId: target.id,
      after: { status },
    });
    return this.toListItem(updated);
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
    await this.userCache.invalidate(target.id);
    if (target.role !== role) {
      await this.auth.revokeAllUserSessions(target.id);
    }
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'user.role_changed',
      resourceType: 'user',
      resourceId: target.id,
      before: { role: target.role },
      after: { role },
    });
    return this.toListItem(updated);
  }

  /** Marks email verified and activates pending accounts. */
  async verify(actor: JwtPayload, id: string) {
    const target = await this.assertManageable(actor, id);
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: {
        emailVerifiedAt: new Date(),
        ...(target.status === UserStatus.PENDING_VERIFICATION ? { status: UserStatus.ACTIVE } : {}),
      },
      select: userSelect,
    });
    await this.userCache.invalidate(target.id);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'user.verified',
      resourceType: 'user',
      resourceId: target.id,
    });
    return this.toListItem(updated);
  }

  /** Triggers the standard password-reset email for an ACTIVE account. */
  async sendPasswordReset(actor: JwtPayload, id: string) {
    const target = await this.assertManageable(actor, id);
    const user = await this.prisma.user.findUnique({
      where: { id: target.id },
      select: { email: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Password reset can only be sent to active accounts');
    }
    await this.auth.forgotPassword(user.email);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'user.password_reset_sent',
      resourceType: 'user',
      resourceId: target.id,
    });
    return { sent: true };
  }

  /** Soft delete. Email and phone are anonymized so both can register again. */
  async softDelete(actor: JwtPayload, id: string): Promise<void> {
    const target = await this.assertManageable(actor, id);
    const current = await this.prisma.user.findUnique({
      where: { id: target.id },
      select: { email: true, phone: true },
    });
    if (!current) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: target.id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.SUSPENDED,
        deletedEmail: current.email,
        deletedPhone: current.phone,
        email: `deleted+${target.id}@deleted.invalid`,
        phone: `deleted+${target.id}`,
      },
    });
    await this.userCache.invalidate(target.id);
    await this.auth.revokeAllUserSessions(target.id);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'user.soft_deleted',
      resourceType: 'user',
      resourceId: target.id,
    });
  }

  /** Restores a soft-deleted account using preserved contact fields. */
  async restore(actor: JwtPayload, id: string) {
    const target = await this.assertManageable(actor, id, {
      allowDeleted: true,
      requireDeleted: true,
    });
    const current = await this.prisma.user.findUnique({
      where: { id: target.id },
      select: { deletedEmail: true, deletedPhone: true },
    });
    if (!current?.deletedEmail || !current.deletedPhone) {
      throw new BadRequestException(
        'This account cannot be restored (contact details unavailable)',
      );
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: target.id },
        data: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          email: current.deletedEmail,
          phone: current.deletedPhone,
          deletedEmail: null,
          deletedPhone: null,
        },
        select: userSelect,
      });
      await this.userCache.invalidate(target.id);
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'user.restored',
        resourceType: 'user',
        resourceId: target.id,
      });
      return this.toListItem(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          uniqueConflictIncludes(error, 'phone')
            ? PHONE_ALREADY_REGISTERED
            : EMAIL_ALREADY_REGISTERED,
        );
      }
      throw error;
    }
  }

  async bulk(actor: JwtPayload, dto: BulkUsersDto) {
    const skipped: string[] = [];
    let processed = 0;

    for (const id of dto.ids) {
      try {
        switch (dto.action) {
          case BulkUserAction.ACTIVATE:
            await this.updateStatus(actor, id, UserStatus.ACTIVE);
            break;
          case BulkUserAction.SUSPEND:
            await this.updateStatus(actor, id, UserStatus.SUSPENDED);
            break;
          case BulkUserAction.VERIFY:
            await this.verify(actor, id);
            break;
          case BulkUserAction.SOFT_DELETE:
            await this.softDelete(actor, id);
            break;
          case BulkUserAction.RESTORE:
            await this.restore(actor, id);
            break;
          default:
            skipped.push(id);
            continue;
        }
        processed += 1;
      } catch {
        skipped.push(id);
      }
    }

    return { processed, skipped };
  }

  private buildListWhere(actor: JwtPayload, query: ListUsersQueryDto): Prisma.UserWhereInput {
    const roleFilter = actor.role === Role.SUPER_ADMIN ? query.role : Role.CUSTOMER;

    const createdAt: Prisma.DateTimeFilter | undefined =
      query.createdFrom || query.createdTo
        ? {
            ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
            ...(query.createdTo
              ? {
                  lte: (() => {
                    const end = new Date(query.createdTo);
                    end.setHours(23, 59, 59, 999);
                    return end;
                  })(),
                }
              : {}),
          }
        : undefined;

    const search = query.search?.trim();
    return {
      deletedAt: query.deleted ? { not: null } : null,
      role: roleFilter,
      status: query.status,
      ...(createdAt ? { createdAt } : {}),
      ...(query.verified === true ? { emailVerifiedAt: { not: null } } : {}),
      ...(query.verified === false ? { emailVerifiedAt: null } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(sort: UserListSort): Prisma.UserOrderByWithRelationInput[] {
    switch (sort) {
      case UserListSort.CREATED_ASC:
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case UserListSort.NAME_ASC:
        return [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'desc' }];
      case UserListSort.NAME_DESC:
        return [{ firstName: 'desc' }, { lastName: 'desc' }, { id: 'desc' }];
      case UserListSort.ORDERS_DESC:
        return [{ customerMetric: { orderCount: 'desc' } }, { id: 'desc' }];
      case UserListSort.SPENDING_DESC:
        return [{ customerMetric: { lifetimeValuePoisha: 'desc' } }, { id: 'desc' }];
      case UserListSort.LAST_LOGIN_DESC:
        // Prisma cannot order by nested session max easily; fall back to createdAt.
        return [{ updatedAt: 'desc' }, { id: 'desc' }];
      case UserListSort.CREATED_DESC:
      default:
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  private toListItem(user: UserRow) {
    const lastLoginAt = user.sessions[0]?.lastSeenAt ?? user.sessions[0]?.createdAt ?? null;
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerifiedAt: user.emailVerifiedAt,
      emailVerified: Boolean(user.emailVerifiedAt),
      registrationMethod: 'EMAIL' as const,
      lastLoginAt,
      orderCount: user.customerMetric?.orderCount ?? 0,
      totalSpending: poishaToTaka(user.customerMetric?.lifetimeValuePoisha ?? 0n),
      adminNotes: user.adminNotes,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private assertCanRead(actor: JwtPayload, targetRole: Role) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (targetRole !== Role.CUSTOMER) {
      throw new ForbiddenException('You are not allowed to access this account');
    }
  }

  /**
   * Hierarchy gate for every mutation:
   * - no self-management (prevents self-suspension lockouts)
   * - ADMIN may only manage CUSTOMER accounts
   * - SUPER_ADMIN may manage ADMIN and CUSTOMER accounts, never other SUPER_ADMINs
   */
  private async assertManageable(
    actor: JwtPayload,
    targetId: string,
    options?: { allowDeleted?: boolean; requireDeleted?: boolean },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, status: true, deletedAt: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (!options?.allowDeleted && target.deletedAt) throw new NotFoundException('User not found');
    if (options?.requireDeleted && !target.deletedAt) {
      throw new BadRequestException('Account is not deleted');
    }
    if (target.id === actor.sub)
      throw new ForbiddenException('You cannot manage your own account from this endpoint');
    if (!canManage(actor.role, target.role))
      throw new ForbiddenException('You are not allowed to manage this account');
    return target;
  }
}
