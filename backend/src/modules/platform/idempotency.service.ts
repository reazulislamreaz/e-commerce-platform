import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { requestBodyHash } from '@/common/utils/hash';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyClaim =
  | { kind: 'new'; id: string }
  | { kind: 'replay'; responseCode: number; responseBody: unknown };

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(
    scope: string,
    key: string,
    body: unknown,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<IdempotencyClaim> {
    const requestHash = requestBodyHash(body);
    const existing = await tx.idempotencyKey.findUnique({
      where: { scope_key: { scope, key } },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException('Idempotency-Key was reused with a different request body');
      }
      if (existing.responseCode != null && existing.responseBody != null) {
        return {
          kind: 'replay',
          responseCode: existing.responseCode,
          responseBody: existing.responseBody,
        };
      }
      return { kind: 'new', id: existing.id };
    }

    const created = await tx.idempotencyKey.create({
      data: {
        scope,
        key,
        requestHash,
        expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
      },
      select: { id: true },
    });
    return { kind: 'new', id: created.id };
  }

  async saveResponse(
    scope: string,
    key: string,
    responseCode: number,
    responseBody: unknown,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.idempotencyKey.update({
      where: { scope_key: { scope, key } },
      data: { responseCode, responseBody: responseBody as Prisma.InputJsonValue },
    });
  }
}
