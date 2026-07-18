import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export interface AuditWriteInput {
  actorUserId?: string | null;
  actorRole?: Role | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditWriteInput, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        before: (input.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (input.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        requestId: input.requestId,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  }
}
