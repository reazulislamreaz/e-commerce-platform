import { Injectable } from '@nestjs/common';
import { ContactMessageStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type ContactMessageRecord = Prisma.ContactMessageGetPayload<object>;

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.ContactMessageCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ContactMessageRecord> {
    return tx.contactMessage.create({ data });
  }

  listAdmin(query: {
    cursor?: string;
    limit: number;
    status?: ContactMessageStatus;
  }): Promise<ContactMessageRecord[]> {
    return this.prisma.contactMessage.findMany({
      where: { status: query.status },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  findById(id: string): Promise<ContactMessageRecord | null> {
    return this.prisma.contactMessage.findUnique({ where: { id } });
  }

  update(
    id: string,
    data: Prisma.ContactMessageUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ContactMessageRecord> {
    return tx.contactMessage.update({ where: { id }, data });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
