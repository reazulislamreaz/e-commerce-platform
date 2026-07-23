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

  async listAdmin(query: {
    skip: number;
    take: number;
    status?: ContactMessageStatus;
  }): Promise<{ rows: ContactMessageRecord[]; total: number }> {
    const where: Prisma.ContactMessageWhereInput = { status: query.status };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return { rows, total };
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
